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
  packSize: number;
  packPrice: number;
  packLabel: string;
  eachGrams?: number;
  eachLabel?: string;
  /** Spices and oils: bought every few months, so a week only wears down a slice of the pack. */
  staple?: boolean;
}

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
}

export interface WeekPlan {
  weekIndex: number;
  start: Date;
  lunches: PlannedMeal[];
  dinners: PlannedMeal[];
  /** byDay[dayIndex] = { lunch, dinner } */
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
