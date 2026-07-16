import type { PoolResult } from "./filters";

export type Aisle =
  | "meat"
  | "seafood"
  | "dairy"
  | "produce"
  | "grains"
  | "pantry";

export const AISLE_ORDER: Aisle[] = [
  "produce",
  "meat",
  "seafood",
  "dairy",
  "grains",
  "pantry",
];

export const AISLE_LABEL: Record<Aisle, string> = {
  produce: "Produce",
  meat: "Meat counter",
  seafood: "Seafood",
  dairy: "Dairy & eggs",
  grains: "Grains & bread",
  pantry: "Pantry",
};

/** The nine things most likely to matter. Tagged per ingredient, not per meal,
 *  so a swap in `meals.ts` cannot silently forget an allergen. */
export type Allergen =
  | "gluten"
  | "dairy"
  | "egg"
  | "fish"
  | "shellfish"
  | "peanut"
  | "treenut"
  | "soy"
  | "sesame";

export const ALLERGENS: Allergen[] = [
  "gluten",
  "dairy",
  "egg",
  "fish",
  "shellfish",
  "peanut",
  "treenut",
  "soy",
  "sesame",
];

export const ALLERGEN_LABEL: Record<Allergen, string> = {
  gluten: "Gluten",
  dairy: "Dairy",
  egg: "Egg",
  fish: "Fish",
  shellfish: "Shellfish",
  peanut: "Peanut",
  treenut: "Tree nuts",
  soy: "Soy",
  sesame: "Sesame",
};

/** What an ingredient *is*, for diet rules. Separate from allergens: someone can
 *  skip pork without being allergic to it. */
export type FoodTag =
  | "poultry"
  | "red-meat"
  | "pork"
  | "fish"
  | "shellfish"
  | "dairy"
  | "egg";

export type Diet =
  | "anything"
  | "no-pork"
  | "no-red-meat"
  | "pescatarian"
  | "vegetarian";

export const DIET_LABEL: Record<Diet, string> = {
  anything: "Anything",
  "no-pork": "No pork",
  "no-red-meat": "No red meat",
  pescatarian: "Pescatarian",
  vegetarian: "Vegetarian",
};

/** Which food tags each diet rules out. */
export const DIET_EXCLUDES: Record<Diet, FoodTag[]> = {
  anything: [],
  "no-pork": ["pork"],
  "no-red-meat": ["red-meat", "pork"],
  pescatarian: ["poultry", "red-meat", "pork"],
  vegetarian: ["poultry", "red-meat", "pork", "fish", "shellfish"],
};

/**
 * Nutrition and price are always per 100 of `unit`. Countable things (eggs,
 * limes) still carry a weight so the maths stays in one unit; `eachGrams` only
 * changes how the shopping list phrases them.
 */
export interface Ingredient {
  id: string;
  name: string;
  aisle: Aisle;
  unit: "g" | "ml";
  kcalPer100: number;
  proteinPer100: number;
  carbPer100: number;
  fatPer100: number;
  packSize: number;
  packPrice: number;
  packLabel: string;
  eachGrams?: number;
  eachLabel?: string;
  allergens?: Allergen[];
  tags?: FoodTag[];
  /** Spices and oils: bought every few months, so a week only wears down a slice of the pack. */
  staple?: boolean;
}

/** Everything the user can turn. Targets are per person per day; the planner
 *  halves them, since a day is one lunch plus one dinner. */
export interface Prefs {
  people: number;
  kcal: number;
  /** ± window around `kcal`, as a percentage. Widen it when the pool runs thin. */
  kcalTolerance: number;
  minProtein: number;
  maxCarbs: number;
  maxFat: number;
  diet: Diet;
  allergies: Allergen[];
  /** Ingredient ids to keep out — the "I just don't like it" list. */
  dislikes: string[];
}

export const DEFAULT_PREFS: Prefs = {
  people: 2,
  kcal: 2000,
  kcalTolerance: 15,
  minProtein: 100,
  maxCarbs: 400,
  maxFat: 200,
  diet: "anything",
  allergies: [],
  dislikes: [],
};

export type Station = "prep" | "stovetop" | "oven" | "portion";

export interface PrepStep {
  station: Station;
  minutes: number;
  text: string;
}

export interface MealIngredient {
  id: string;
  /** Amount per single serving, in the ingredient's unit. */
  qty: number;
}

export interface Meal {
  id: string;
  name: string;
  slot: "lunch" | "dinner";
  blurb: string;
  ingredients: MealIngredient[];
  /** Done on Sunday, in bulk. */
  prep: PrepStep[];
  /** Done on the day. Must total <= 10 minutes. */
  assemble: string[];
  assembleMinutes: number;
  keepsDays: number;
  freezes: boolean;
}

export interface PlannedMeal {
  meal: Meal;
  days: number[];
  servings: number;
  kcalPerServing: number;
  proteinPerServing: number;
  carbsPerServing: number;
  fatPerServing: number;
  /** Slot this dish was drawn into, before scheduling reorders by keeping time.
   *  Swaps key off this, so a swap survives the reorder it causes. */
  pickIndex: number;
  /** True when the user chose this dish over the one the rotation picked. */
  swapped: boolean;
}

/** `${weekIndex}:${slot}:${pickIndex}` -> meal id. Scoped per week, so swapping
 *  this week's salmon does not rewrite every other week. */
export type Overrides = Record<string, string>;

export const overrideKey = (weekIndex: number, slot: "lunch" | "dinner", pickIndex: number) =>
  `${weekIndex}:${slot}:${pickIndex}`;

export interface WeekPlan {
  weekIndex: number;
  start: Date;
  lunches: PlannedMeal[];
  dinners: PlannedMeal[];
  /** False when filters leave no lunches or no dinners — there is no week to show. */
  viable: boolean;
  /** Kept so the UI can explain which filter cost which dish. */
  lunchPool: PoolResult;
  dinnerPool: PoolResult;
  /** byDay[dayIndex] = { lunch, dinner }. Empty when `viable` is false. */
  byDay: { lunch: PlannedMeal; dinner: PlannedMeal }[];
}

export interface ShoppingLine {
  ingredient: Ingredient;
  needed: number;
  packs: number;
  bought: number;
  cost: number;
  usedIn: string[];
}
