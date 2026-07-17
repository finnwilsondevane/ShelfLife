import { INGREDIENTS } from "./ingredients";
import type { Ingredient } from "./types";

/**
 * Matching free text (a Spoonacular ingredient name, a line pasted from a
 * flyer) against the curated ingredient list.
 *
 * Nothing here is fetched or guessed at runtime from a third party — it is a
 * static lookup against `INGREDIENTS`, so it works offline and never needs a
 * key. A miss is not a failure: the caller decides what an unmatched name
 * means (unpriced, unverified allergens), it just cannot pretend to know.
 */

const BY_ID = new Map(INGREDIENTS.map((i) => [i.id, i]));

const STOPWORDS = new Set([
  "fresh", "chopped", "diced", "minced", "sliced", "large", "small", "medium",
  "boneless", "skinless", "lean", "extra", "virgin", "grated", "shredded",
  "ground", "whole", "raw", "cooked", "organic", "of", "and", "the", "a", "to",
  "taste", "for", "optional", "packed", "finely", "coarsely", "peeled",
  "trimmed", "cut", "into", "pieces", "cubed", "halved", "plain", "low",
  "fat", "unsalted", "salted", "dry", "dried",
]);

function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w))
    .join(" ")
    .trim();
}

function singularize(word: string): string {
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (word.endsWith("oes")) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function words(norm: string): string[] {
  return norm
    .split(" ")
    .map(singularize)
    .filter((w) => w.length > 2);
}

/**
 * Common Spoonacular / flyer phrasings that the word-overlap fuzzy match
 * below cannot bridge on its own — either because the words genuinely
 * differ ("stock" vs "broth") or because the curated name is deliberately
 * generic ("spices" standing in for salt, pepper, cumin, etc). Checked
 * longest key first, so "red bell pepper" beats a bare "pepper".
 */
const ALIAS_LIST: [string, string][] = [
  ["boneless skinless chicken breast", "chicken-breast"],
  ["chicken breast", "chicken-breast"],
  ["chicken thigh", "chicken-thigh"],
  ["ground beef", "ground-beef"],
  ["yellow onion", "onion"],
  ["onion", "onion"],
  ["garlic clove", "garlic"],
  ["clove garlic", "garlic"],
  ["olive oil", "olive-oil"],
  ["soy sauce", "soy-sauce"],
  ["kosher salt", "spices"],
  ["salt and pepper", "spices"],
  ["black pepper", "spices"],
  ["salt", "spices"],
  ["pepper", "spices"],
  ["egg", "eggs"],
  ["parmesan", "parmesan"],
  ["cheddar", "cheddar"],
  ["greek yogurt", "greek-yogurt"],
  ["yogurt", "greek-yogurt"],
  ["bell pepper", "bell-pepper"],
  ["sweet potato", "sweet-potato"],
  ["russet potato", "potato"],
  ["yukon gold potato", "potato"],
  ["cherry tomato", "cherry-tomato"],
  ["diced tomato", "canned-tomato"],
  ["canned tomato", "canned-tomato"],
  ["tomato paste", "tomato-paste"],
  ["coconut milk", "coconut-milk"],
  ["chicken broth", "chicken-broth"],
  ["chicken stock", "chicken-broth"],
  ["black bean", "black-beans"],
  ["chickpea", "chickpeas"],
  ["garbanzo bean", "chickpeas"],
  ["peanut butter", "peanut-butter"],
  ["honey", "honey"],
  ["brown rice", "brown-rice"],
  ["white rice", "rice"],
  ["jasmine rice", "rice"],
  ["rice vinegar", "balsamic-vinegar"],
  ["spaghetti", "pasta"],
  ["penne", "pasta"],
  ["noodle", "pasta"],
  ["flour tortilla", "tortilla"],
  ["corn tortilla", "tortilla"],
  ["salmon", "salmon"],
  ["shrimp", "shrimp"],
  ["prawn", "shrimp"],
  ["cod", "cod"],
  ["ground turkey", "ground-turkey"],
  ["pork chop", "pork-loin"],
  ["pork loin", "pork-loin"],
  ["bacon", "bacon"],
  ["sirloin", "beef-sirloin"],
  ["steak", "beef-sirloin"],
  ["milk", "milk"],
  ["butter", "butter"],
  ["cream cheese", "cream-cheese"],
  ["sour cream", "sour-cream"],
  ["mozzarella", "mozzarella"],
  ["feta", "feta"],
  ["spinach", "spinach"],
  ["broccoli", "broccoli"],
  ["carrot", "carrot"],
  ["cucumber", "cucumber"],
  ["romaine", "romaine"],
  ["lettuce", "romaine"],
  ["lime juice", "lime"],
  ["lime", "lime"],
  ["lemon juice", "lemon"],
  ["lemon", "lemon"],
  ["ginger", "ginger"],
  ["red onion", "red-onion"],
  ["zucchini", "zucchini"],
  ["avocado", "avocado"],
  ["mushroom", "mushroom"],
  ["kale", "kale"],
  ["cauliflower", "cauliflower"],
  ["celery", "celery"],
  ["cilantro", "cilantro"],
  ["coriander", "cilantro"],
  ["jalapeno", "jalapeno"],
  ["jalapeño", "jalapeno"],
  ["oat", "oats"],
  ["bread", "bread"],
  ["couscous", "couscous"],
  ["balsamic vinegar", "balsamic-vinegar"],
  ["sesame oil", "sesame-oil"],
  ["vegetable oil", "vegetable-oil"],
  ["canola oil", "vegetable-oil"],
  ["dijon", "dijon-mustard"],
  ["mustard", "dijon-mustard"],
  ["maple syrup", "maple-syrup"],
  ["almond", "almonds"],
  ["hot sauce", "hot-sauce"],
  ["sriracha", "hot-sauce"],
  ["tahini", "tahini"],
  ["curry paste", "curry-paste"],
  ["salsa", "salsa"],
  ["quinoa", "quinoa"],
  ["tuna", "tuna-can"],
];
const ALIASES: [string, string][] = [...ALIAS_LIST].sort((a, b) => b[0].length - a[0].length);

export type MatchConfidence = "alias" | "exact" | "fuzzy";

export interface IngredientMatch {
  id: string;
  ingredient: Ingredient;
  confidence: MatchConfidence;
}

/** Matches free text against the curated ingredient list, or returns null. */
export function matchIngredient(rawName: string): IngredientMatch | null {
  const norm = normalize(rawName);
  if (!norm) return null;

  for (const [phrase, id] of ALIASES) {
    if (norm === phrase || norm.includes(phrase)) {
      const ingredient = BY_ID.get(id);
      if (ingredient) return { id, ingredient, confidence: "alias" };
    }
  }

  for (const ing of INGREDIENTS) {
    if (normalize(ing.name) === norm) return { id: ing.id, ingredient: ing, confidence: "exact" };
  }

  // Every significant word in the curated name must show up in the input —
  // strict enough that "chicken broth" cannot win just because the input
  // also happens to mention chicken.
  const inputWords = words(norm);
  if (!inputWords.length) return null;

  let best: { ingredient: Ingredient; score: number } | null = null;
  for (const ing of INGREDIENTS) {
    const ingWords = words(normalize(ing.name));
    if (!ingWords.length) continue;
    const overlap = ingWords.filter((w) => inputWords.includes(w)).length;
    if (overlap === ingWords.length && (!best || overlap > best.score)) {
      best = { ingredient: ing, score: overlap };
    }
  }
  return best ? { id: best.ingredient.id, ingredient: best.ingredient, confidence: "fuzzy" } : null;
}
