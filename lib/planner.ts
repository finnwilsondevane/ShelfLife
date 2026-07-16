import { filterPool, nutrition } from "./filters";
import type { PoolResult } from "./filters";
import { BY_ID, unitPrice } from "./ingredients";
import { DINNER_POOL, LUNCH_POOL } from "./meals";
import type { Meal, PlannedMeal, Prefs, ShoppingLine, WeekPlan } from "./types";

export const DISHES_PER_SLOT = 4;
export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export { nutrition };
export type { Macros } from "./filters";

/** A Sunday. Week indices count forward from here so plans are stable forever. */
const ANCHOR = Date.UTC(2024, 0, 7);
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function currentWeekIndex(now = new Date()): number {
  const sunday = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
  return Math.round((sunday - ANCHOR) / WEEK_MS);
}

export function weekStart(weekIndex: number): Date {
  return new Date(ANCHOR + weekIndex * WEEK_MS);
}

export function formatRange(start: Date): string {
  const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date, withMonth: boolean) =>
    d.toLocaleDateString("en-CA", {
      month: withMonth ? "short" : undefined,
      day: "numeric",
      timeZone: "UTC",
    });
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  return `${fmt(start, true)} – ${fmt(end, !sameMonth)}`;
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Roughly "how many dollars of shopping these two meals share". Staples are
 * ignored — every meal uses oil and spices, so counting them would make each
 * pair look identical.
 */
function overlapScore(a: Meal, b: Meal): number {
  let score = 0;
  for (const ia of a.ingredients) {
    const ib = b.ingredients.find((x) => x.id === ia.id);
    if (!ib) continue;
    const ing = BY_ID[ia.id];
    if (!ing || ing.staple) continue;
    score += Math.min(ia.qty, ib.qty) * unitPrice(ing);
  }
  return score;
}

/**
 * Order the pool so that ingredient-sharing dishes end up neighbours, then hand
 * each week a sliding window of that order. Two things fall out of this: any
 * four consecutive dishes resolve to one tight shop, and consecutive weeks never
 * draw the same window.
 */
function chainByOverlap(pool: Meal[], seed: number): Meal[] {
  const rng = mulberry32(seed);
  const remaining = [...pool];
  const first = remaining.splice(Math.floor(rng() * remaining.length), 1)[0];
  const chain = [first];

  while (remaining.length) {
    let bestIndex = 0;
    let bestScore = -1;
    const window = chain.slice(-(DISHES_PER_SLOT - 1));
    remaining.forEach((candidate, i) => {
      const score =
        window.reduce((sum, m) => sum + overlapScore(m, candidate), 0) +
        rng() * 0.15; // tiny jitter so equal-overlap ties do not always break the same way
      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    });
    chain.push(remaining.splice(bestIndex, 1)[0]);
  }
  return chain;
}

function pickForWeek(pool: Meal[], weekIndex: number, salt: number): Meal[] {
  // Filters can leave fewer than four dishes. Take what exists rather than
  // wrapping the window onto itself, which would serve the same dish twice.
  const take = Math.min(DISHES_PER_SLOT, pool.length);
  if (take === 0) return [];

  const cycleLength = Math.max(1, Math.ceil(pool.length / take));
  const cycle = Math.floor(weekIndex / cycleLength);
  const slot = ((weekIndex % cycleLength) + cycleLength) % cycleLength;
  const chain = chainByOverlap(pool, cycle * 7919 + salt);

  const start = slot * take;
  // take <= chain.length, so consecutive indices mod length stay distinct.
  return Array.from({ length: take }, (_, i) => chain[(start + i) % chain.length]);
}

export function servingCost(meal: Meal): number {
  return meal.ingredients.reduce((sum, { id, qty }) => {
    const ing = BY_ID[id];
    return ing ? sum + qty * unitPrice(ing) : sum;
  }, 0);
}

/** Spread `days` days across `dishes` dishes as evenly as possible: 7 over 4 gives 2,2,2,1. */
function distribute(days: number, dishes: number): number[] {
  if (dishes <= 0) return [];
  const base = Math.floor(days / dishes);
  const extra = days % dishes;
  return Array.from({ length: dishes }, (_, i) => base + (i < extra ? 1 : 0));
}

function schedule(picks: Meal[], people: number): PlannedMeal[] {
  // Shortest-keeping dishes get the earliest days — salmon should not be sitting
  // in the fridge until Friday.
  const sorted = [...picks].sort((a, b) => a.keepsDays - b.keepsDays);
  const counts = distribute(DAYS.length, sorted.length);

  let day = 0;
  return sorted.map((meal, i) => {
    const days: number[] = [];
    for (let k = 0; k < counts[i]; k++) days.push(day++);
    const { kcal, protein, carbs, fat } = nutrition(meal);
    return {
      meal,
      days,
      servings: days.length * people,
      kcalPerServing: kcal,
      proteinPerServing: protein,
      carbsPerServing: carbs,
      fatPerServing: fat,
    };
  });
}

export function buildWeek(weekIndex: number, prefs: Prefs): WeekPlan {
  const lunchPool = filterPool(LUNCH_POOL, prefs);
  const dinnerPool = filterPool(DINNER_POOL, prefs);

  const lunches = schedule(pickForWeek(lunchPool.passing, weekIndex, 1), prefs.people);
  const dinners = schedule(pickForWeek(dinnerPool.passing, weekIndex, 2), prefs.people);

  // A week needs both halves. With neither, there is nothing to schedule and the
  // UI shows why rather than rendering a broken grid.
  const viable = lunches.length > 0 && dinners.length > 0;

  const find = (list: PlannedMeal[], day: number) => list.find((p) => p.days.includes(day))!;

  return {
    weekIndex,
    start: weekStart(weekIndex),
    lunches,
    dinners,
    viable,
    lunchPool,
    dinnerPool,
    byDay: viable
      ? DAYS.map((_, day) => ({ lunch: find(lunches, day), dinner: find(dinners, day) }))
      : [],
  };
}

/** Days a portion sits in the fridge before it is eaten, counting Sunday prep as day 0. */
export function needsFreezing(planned: PlannedMeal): number[] {
  return planned.days.filter((d) => d > planned.meal.keepsDays);
}

export function buildShoppingList(plan: WeekPlan): ShoppingLine[] {
  const needed = new Map<string, { qty: number; meals: Set<string> }>();

  for (const planned of [...plan.lunches, ...plan.dinners]) {
    for (const { id, qty } of planned.meal.ingredients) {
      const entry = needed.get(id) ?? { qty: 0, meals: new Set<string>() };
      entry.qty += qty * planned.servings;
      entry.meals.add(planned.meal.name);
      needed.set(id, entry);
    }
  }

  const lines: ShoppingLine[] = [];
  for (const [id, entry] of needed) {
    const ingredient = BY_ID[id];
    if (!ingredient) continue;

    if (ingredient.staple) {
      // Oil, spices, rice: a 4 kg bag is not a weekly purchase, so charge the
      // week only for the slice it actually wears through.
      lines.push({
        ingredient,
        needed: entry.qty,
        packs: 0,
        bought: entry.qty,
        cost: entry.qty * unitPrice(ingredient),
        usedIn: [...entry.meals],
      });
    } else {
      const packs = Math.ceil(entry.qty / ingredient.packSize);
      lines.push({
        ingredient,
        needed: entry.qty,
        packs,
        bought: packs * ingredient.packSize,
        cost: packs * ingredient.packPrice,
        usedIn: [...entry.meals],
      });
    }
  }

  return lines.sort((a, b) => b.cost - a.cost);
}

export interface CostSummary {
  total: number;
  perPersonPerDay: number;
  perServing: number;
  byAisle: { aisle: string; cost: number }[];
  byMeal: { name: string; slot: string; cost: number; servings: number; each: number }[];
  stapleCost: number;
  freshCost: number;
  leftoverValue: number;
}

export function costSummary(
  plan: WeekPlan,
  lines: ShoppingLine[],
  people: number,
): CostSummary {
  const total = lines.reduce((s, l) => s + l.cost, 0);
  const servings = [...plan.lunches, ...plan.dinners].reduce((s, p) => s + p.servings, 0);

  const aisles = new Map<string, number>();
  for (const line of lines) {
    aisles.set(line.ingredient.aisle, (aisles.get(line.ingredient.aisle) ?? 0) + line.cost);
  }

  return {
    total,
    perPersonPerDay: total / (people * DAYS.length),
    perServing: servings ? total / servings : 0,
    byAisle: [...aisles.entries()]
      .map(([aisle, cost]) => ({ aisle, cost }))
      .sort((a, b) => b.cost - a.cost),
    byMeal: [...plan.lunches, ...plan.dinners].map((p) => ({
      name: p.meal.name,
      slot: p.meal.slot,
      cost: servingCost(p.meal) * p.servings,
      servings: p.servings,
      each: servingCost(p.meal),
    })),
    stapleCost: lines.filter((l) => l.ingredient.staple).reduce((s, l) => s + l.cost, 0),
    freshCost: lines.filter((l) => !l.ingredient.staple).reduce((s, l) => s + l.cost, 0),
    // What you paid for but the plan does not call for — the price of pack sizes.
    leftoverValue: lines
      .filter((l) => !l.ingredient.staple)
      .reduce((s, l) => s + (l.bought - l.needed) * unitPrice(l.ingredient), 0),
  };
}

export interface PrepBlock {
  station: string;
  label: string;
  minutes: number;
  items: { meal: string; text: string; minutes: number }[];
}

const STATION_META: Record<string, { label: string; order: number }> = {
  prep: { label: "Chop & marinate", order: 0 },
  oven: { label: "Oven", order: 1 },
  stovetop: { label: "Stovetop", order: 2 },
  portion: { label: "Portion & cool", order: 3 },
};

/**
 * Grouped by station rather than by recipe, because the real Sunday constraint
 * is that you have one oven and two burners — not that recipes want finishing
 * one at a time.
 */
export function prepPlan(plan: WeekPlan): PrepBlock[] {
  const blocks = new Map<string, PrepBlock>();

  for (const planned of [...plan.lunches, ...plan.dinners]) {
    for (const step of planned.meal.prep) {
      const meta = STATION_META[step.station];
      const block = blocks.get(step.station) ?? {
        station: step.station,
        label: meta.label,
        minutes: 0,
        items: [],
      };
      block.minutes += step.minutes;
      block.items.push({ meal: planned.meal.name, text: step.text, minutes: step.minutes });
      blocks.set(step.station, block);
    }
  }

  return [...blocks.values()].sort(
    (a, b) => STATION_META[a.station].order - STATION_META[b.station].order,
  );
}

/**
 * Wall-clock estimate. Oven and stovetop overlap in practice, so the honest
 * number is not the sum of every step.
 */
export function prepDuration(blocks: PrepBlock[]): number {
  const at = (s: string) => blocks.find((b) => b.station === s)?.minutes ?? 0;
  return at("prep") + Math.max(at("oven"), at("stovetop")) + at("portion");
}

export const money = (n: number) =>
  n.toLocaleString("en-CA", { style: "currency", currency: "CAD" });

export type { PoolResult };
