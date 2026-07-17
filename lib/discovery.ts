import type { Allergen, Prefs } from "./types";
import { DIET_EXCLUDES } from "./types";

/**
 * A recipe found through Spoonacular, kept deliberately separate from `Meal`.
 *
 * Two reasons they are not the same type. Legally: we store facts (title,
 * macros, ingredient names) and link out, rather than republishing someone
 * else's instructions and photos on a public site. Practically: a `Meal` carries
 * hand-tagged ingredient ids that drive the shopping list, the costing and the
 * allergen guarantees. Nothing here has been through that, and pretending
 * otherwise is how an allergen filter quietly starts lying.
 */
export interface Discovered {
  /** Prefixed so a Spoonacular id can never collide with a curated meal id. */
  id: string;
  title: string;
  /** Where the actual recipe lives. We send people there; we do not copy it. */
  sourceUrl: string;
  image?: string;
  servings: number;
  readyInMinutes: number;
  /** Per serving, as Spoonacular reports it. */
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Spoonacular's own diet flags, e.g. "gluten free", "dairy free". */
  diets: string[];
  dishTypes: string[];
  /** Names only — enough to search and to eyeball before promoting. */
  ingredients: string[];
  fetchedAt: string;
}

export interface DiscoveryIndex {
  recipes: Discovered[];
  updatedAt: string;
  /** Null until the first successful fetch, which needs SPOONACULAR_KEY. */
  source: string | null;
}

/** Shape of the bits of Spoonacular's complexSearch response we rely on. */
interface SpoonNutrient {
  name?: string;
  amount?: number;
  unit?: string;
}
interface SpoonIngredient {
  name?: string;
  originalName?: string;
}
export interface SpoonResult {
  id?: number;
  title?: string;
  sourceUrl?: string;
  spoonacularSourceUrl?: string;
  image?: string;
  servings?: number;
  readyInMinutes?: number;
  diets?: string[];
  dishTypes?: string[];
  nutrition?: {
    nutrients?: SpoonNutrient[];
    ingredients?: SpoonIngredient[];
  };
}

const nutrient = (list: SpoonNutrient[] | undefined, name: string): number => {
  const hit = list?.find((n) => n.name?.toLowerCase() === name.toLowerCase());
  return Math.round(hit?.amount ?? 0);
};

/**
 * Spoonacular → Discovered. Returns null rather than a half-built record when
 * the essentials are missing: a recipe with no calories cannot be filtered on
 * macros, which is the entire reason it would be in the index.
 */
export function normalize(r: SpoonResult, now = new Date()): Discovered | null {
  const id = r.id;
  const title = r.title?.trim();
  const url = r.sourceUrl || r.spoonacularSourceUrl;
  if (!id || !title || !url) return null;

  const nutrients = r.nutrition?.nutrients;
  const kcal = nutrient(nutrients, "Calories");
  if (kcal <= 0) return null;

  return {
    id: `sp-${id}`,
    title,
    sourceUrl: url,
    image: r.image,
    servings: r.servings && r.servings > 0 ? r.servings : 1,
    readyInMinutes: r.readyInMinutes ?? 0,
    kcal,
    protein: nutrient(nutrients, "Protein"),
    carbs: nutrient(nutrients, "Carbohydrates"),
    fat: nutrient(nutrients, "Fat"),
    diets: r.diets ?? [],
    dishTypes: r.dishTypes ?? [],
    ingredients: (r.nutrition?.ingredients ?? [])
      .map((i) => (i.originalName || i.name || "").trim())
      .filter(Boolean),
    fetchedAt: now.toISOString(),
  };
}

/** Spoonacular diet flags that prove an allergen is absent. There is no flag
 *  that proves one is present, which is exactly why discovered recipes never
 *  inherit the curated pool's allergen guarantees. */
const FREE_OF: Partial<Record<Allergen, string[]>> = {
  gluten: ["gluten free"],
  dairy: ["dairy free"],
  egg: ["vegan"],
  fish: ["vegan", "vegetarian"],
  shellfish: ["vegan", "vegetarian"],
  peanut: [],
  treenut: [],
  soy: [],
  sesame: [],
};

/**
 * Which of the user's allergies this recipe cannot be cleared of. Spoonacular
 * only tells us what a recipe is *free of*, so anything it stays silent about
 * is unknown, not safe. Unknown is surfaced, never swallowed.
 */
export function unverifiedAllergens(r: Discovered, prefs: Prefs): Allergen[] {
  const flags = r.diets.map((d) => d.toLowerCase());
  return prefs.allergies.filter((a) => !(FREE_OF[a] ?? []).some((f) => flags.includes(f)));
}

const DIET_FLAG: Record<string, string[]> = {
  "no-pork": [],
  "no-red-meat": [],
  pescatarian: ["pescatarian", "vegetarian", "vegan"],
  vegetarian: ["vegetarian", "vegan"],
};

export interface DiscoveryMatch {
  recipe: Discovered;
  /** Allergies we could not clear — the recipe still shows, with a warning. */
  unverified: Allergen[];
}

/**
 * Filters the discovery index against the same targets as the curated pool, so
 * one set of controls governs both tiers. Macros are compared per serving,
 * against half a day, exactly as `filters.ts` does for meals.
 */
export function searchDiscovered(
  index: Discovered[],
  prefs: Prefs,
  query: string,
): DiscoveryMatch[] {
  const half = prefs.kcal / 2;
  const slack = half * (prefs.kcalTolerance / 100);
  const q = query.trim().toLowerCase();

  return index
    .filter((r) => {
      if (r.kcal < half - slack || r.kcal > half + slack) return false;
      if (r.protein < prefs.minProtein / 2) return false;
      if (r.carbs > prefs.maxCarbs / 2) return false;
      if (r.fat > prefs.maxFat / 2) return false;

      // Diet: only trust an explicit flag. Silence is not a yes.
      const needed = DIET_FLAG[prefs.diet] ?? [];
      if (needed.length) {
        const flags = r.diets.map((d) => d.toLowerCase());
        if (!needed.some((f) => flags.includes(f))) return false;
      }
      // Meat-avoidance the flags cannot express falls back to the ingredient
      // names — crude, but it beats showing pork to someone avoiding pork.
      const banned = DIET_EXCLUDES[prefs.diet];
      const text = (r.title + " " + r.ingredients.join(" ")).toLowerCase();
      if (banned.includes("pork") && /\b(pork|bacon|ham|prosciutto|chorizo)\b/.test(text))
        return false;
      if (banned.includes("red-meat") && /\b(beef|lamb|steak|mince|veal)\b/.test(text))
        return false;

      if (prefs.dislikes.length) {
        // Dislikes are ingredient ids like "chicken-thigh"; match on the words.
        const words = prefs.dislikes.flatMap((d) => d.split("-"));
        if (words.some((w) => w.length > 3 && text.includes(w))) return false;
      }

      if (q && !text.includes(q)) return false;
      return true;
    })
    .map((recipe) => ({ recipe, unverified: unverifiedAllergens(recipe, prefs) }))
    .sort((a, b) => b.recipe.protein - a.recipe.protein);
}
