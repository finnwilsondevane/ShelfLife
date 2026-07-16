import { BY_ID } from "./ingredients";
import { DIET_EXCLUDES } from "./types";
import type { Allergen, FoodTag, Meal, Prefs } from "./types";

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

/** Per serving, summed from raw ingredient weights. */
export function nutrition(meal: Meal): Macros {
  let kcal = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  for (const { id, qty } of meal.ingredients) {
    const ing = BY_ID[id];
    if (!ing) continue;
    kcal += (qty * ing.kcalPer100) / 100;
    protein += (qty * ing.proteinPer100) / 100;
    carbs += (qty * ing.carbPer100) / 100;
    fat += (qty * ing.fatPer100) / 100;
  }
  return {
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    carbs: Math.round(carbs),
    fat: Math.round(fat),
  };
}

/** Allergens a meal carries, traced back to the ingredient that brings each one. */
export function mealAllergens(meal: Meal): { allergen: Allergen; from: string }[] {
  const found: { allergen: Allergen; from: string }[] = [];
  for (const { id } of meal.ingredients) {
    const ing = BY_ID[id];
    if (!ing?.allergens) continue;
    for (const a of ing.allergens) {
      if (!found.some((f) => f.allergen === a)) found.push({ allergen: a, from: ing.name });
    }
  }
  return found;
}

/**
 * What the pool can actually deliver. The dishes are written at fixed portions,
 * so a target outside this band matches nothing however the other filters are
 * set — the UI states the band rather than letting you find it by hitting zero.
 */
export function poolRange(pool: Meal[]) {
  const m = pool.map(nutrition);
  const span = (k: keyof Macros) => ({
    min: Math.min(...m.map((x) => x[k])),
    max: Math.max(...m.map((x) => x[k])),
  });
  return { kcal: span("kcal"), protein: span("protein"), carbs: span("carbs"), fat: span("fat") };
}

export type Reject =
  | { kind: "kcal"; value: number; min: number; max: number }
  | { kind: "protein"; value: number; min: number }
  | { kind: "carbs"; value: number; max: number }
  | { kind: "fat"; value: number; max: number }
  | { kind: "allergy"; allergen: Allergen; from: string }
  | { kind: "diet"; tag: FoodTag; from: string }
  | { kind: "dislike"; from: string };

/**
 * Targets are per person per day, but a meal is half a day (one lunch, one
 * dinner). Halving here is what lets the UI speak in daily numbers while the
 * filter compares like with like.
 */
export function perMealBounds(prefs: Prefs) {
  const half = prefs.kcal / 2;
  const slack = half * (prefs.kcalTolerance / 100);
  return {
    kcalMin: Math.round(half - slack),
    kcalMax: Math.round(half + slack),
    proteinMin: Math.round(prefs.minProtein / 2),
    carbsMax: Math.round(prefs.maxCarbs / 2),
    fatMax: Math.round(prefs.maxFat / 2),
  };
}

/** Every reason a meal fails, not just the first — otherwise relaxing one filter
 *  just surfaces the next and the user plays whack-a-mole. */
export function rejections(meal: Meal, prefs: Prefs): Reject[] {
  const out: Reject[] = [];
  const m = nutrition(meal);
  const b = perMealBounds(prefs);

  if (m.kcal < b.kcalMin || m.kcal > b.kcalMax)
    out.push({ kind: "kcal", value: m.kcal, min: b.kcalMin, max: b.kcalMax });
  if (m.protein < b.proteinMin)
    out.push({ kind: "protein", value: m.protein, min: b.proteinMin });
  if (m.carbs > b.carbsMax) out.push({ kind: "carbs", value: m.carbs, max: b.carbsMax });
  if (m.fat > b.fatMax) out.push({ kind: "fat", value: m.fat, max: b.fatMax });

  const banned = new Set<FoodTag>(DIET_EXCLUDES[prefs.diet]);

  for (const { id } of meal.ingredients) {
    const ing = BY_ID[id];
    if (!ing) continue;

    if (prefs.dislikes.includes(id)) out.push({ kind: "dislike", from: ing.name });

    for (const a of ing.allergens ?? []) {
      if (prefs.allergies.includes(a) && !out.some((r) => r.kind === "allergy" && r.allergen === a))
        out.push({ kind: "allergy", allergen: a, from: ing.name });
    }
    for (const t of ing.tags ?? []) {
      if (banned.has(t) && !out.some((r) => r.kind === "diet" && r.tag === t))
        out.push({ kind: "diet", tag: t, from: ing.name });
    }
  }
  return out;
}

export interface PoolResult {
  passing: Meal[];
  rejected: { meal: Meal; reasons: Reject[] }[];
}

export function filterPool(pool: Meal[], prefs: Prefs): PoolResult {
  const passing: Meal[] = [];
  const rejected: { meal: Meal; reasons: Reject[] }[] = [];
  for (const meal of pool) {
    const reasons = rejections(meal, prefs);
    if (reasons.length) rejected.push({ meal, reasons });
    else passing.push(meal);
  }
  return { passing, rejected };
}

/**
 * Which single filter is costing the most meals. Drives the "relax this" hint
 * when the pool runs too thin to fill a week — a count alone tells you that you
 * are stuck, not how to get unstuck.
 */
export function topBlocker(rejected: { reasons: Reject[] }[]): string | null {
  const tally = new Map<string, number>();
  for (const { reasons } of rejected) {
    // Only the first reason: it is the one the user would hit first on relaxing.
    const seen = new Set<string>();
    for (const r of reasons) {
      const key =
        r.kind === "allergy"
          ? `the ${r.allergen} filter`
          : r.kind === "diet"
            ? `the ${r.tag.replace("-", " ")} restriction`
            : r.kind === "dislike"
              ? `dislikes`
              : r.kind === "kcal"
                ? "the calorie window"
                : r.kind === "protein"
                  ? "the protein floor"
                  : r.kind === "carbs"
                    ? "the carb cap"
                    : "the fat cap";
      if (seen.has(key)) continue;
      seen.add(key);
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let n = 0;
  for (const [k, v] of tally) if (v > n) [best, n] = [k, v];
  return best;
}

export function describeReject(r: Reject): string {
  switch (r.kind) {
    case "kcal":
      return `${r.value} kcal — outside ${r.min}–${r.max}`;
    case "protein":
      return `${r.value} g protein — under ${r.min} g`;
    case "carbs":
      return `${r.value} g carbs — over ${r.max} g`;
    case "fat":
      return `${r.value} g fat — over ${r.max} g`;
    case "allergy":
      return `${r.allergen} (${r.from})`;
    case "diet":
      return `${r.tag.replace("-", " ")} (${r.from})`;
    case "dislike":
      return `you dislike ${r.from}`;
  }
}
