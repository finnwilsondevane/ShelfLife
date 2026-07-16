"use client";

import { motion } from "framer-motion";
import {
  CalendarDays,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  ShoppingBasket,
  Wallet,
} from "lucide-react";
import { useMemo, useState, useSyncExternalStore } from "react";
import { CostView } from "@/components/CostView";
import { MealGrid } from "@/components/MealGrid";
import { PrepTimeline } from "@/components/PrepTimeline";
import { ShoppingList } from "@/components/ShoppingList";
import { Card } from "@/components/ui";
import {
  DAYS,
  PEOPLE,
  buildShoppingList,
  buildWeek,
  costSummary,
  currentWeekIndex,
  formatRange,
  money,
  prepDuration,
  prepPlan,
} from "@/lib/planner";

const TABS = [
  { id: "week", label: "This week", icon: CalendarDays },
  { id: "shop", label: "Shopping list", icon: ShoppingBasket },
  { id: "prep", label: "Sunday prep", icon: ChefHat },
  { id: "cost", label: "Cost", icon: Wallet },
] as const;

type TabId = (typeof TABS)[number]["id"];

/** The clock is a client-only source: the server has no business guessing the
 *  user's current week. Rendering week 0 on the server and letting React swap in
 *  the real week after hydration is exactly what this hook is for — reading the
 *  date during render would hydrate a page built on Tuesday against Thursday. */
const NEVER_CHANGES = () => () => {};

export default function Home() {
  const baseWeek = useSyncExternalStore(NEVER_CHANGES, currentWeekIndex, () => 0);
  const [offset, setOffset] = useState(0);
  const [tab, setTab] = useState<TabId>("week");
  const weekIndex = baseWeek + offset;

  const plan = useMemo(() => buildWeek(weekIndex), [weekIndex]);
  const lines = useMemo(() => buildShoppingList(plan), [plan]);
  const summary = useMemo(() => costSummary(plan, lines), [plan, lines]);
  const prepMinutes = useMemo(() => prepDuration(prepPlan(plan)), [plan]);

  const avg = useMemo(() => {
    const kcal = plan.byDay.reduce(
      (s, d) => s + d.lunch.kcalPerServing + d.dinner.kcalPerServing,
      0,
    );
    const protein = plan.byDay.reduce(
      (s, d) => s + d.lunch.proteinPerServing + d.dinner.proteinPerServing,
      0,
    );
    return {
      kcal: Math.round(kcal / DAYS.length),
      protein: Math.round(protein / DAYS.length),
    };
  }, [plan]);

  const weekLabel =
    offset === 0
      ? "This week"
      : offset === 1
        ? "Next week"
        : offset === -1
          ? "Last week"
          : `${offset > 0 ? "+" : ""}${offset} weeks`;

  const totalServings = [...plan.lunches, ...plan.dinners].reduce(
    (s, p) => s + p.servings,
    0,
  );

  return (
    <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-terracotta">
              {`High protein · ${PEOPLE} people · lunches & dinners`}
            </p>
            <h1 className="mt-1.5 font-display text-4xl leading-none text-ink sm:text-5xl">
              Shelf Life
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
              <em className="not-italic text-ink">Cooked Sunday, still good Thursday.</em>{" "}
              Shop Saturday, eat all week. The rotation changes every week but keeps
              reusing the same core ingredients, so the shop stays small.
            </p>
          </div>

          <div className="no-print flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
            <button
              onClick={() => setOffset((o) => o - 1)}
              aria-label="Previous week"
              className="cursor-pointer rounded-lg p-2 text-muted transition-colors duration-200 hover:bg-sand hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <div className="min-w-[9.5rem] px-2 text-center">
              <div className="text-sm font-semibold tabular-nums text-ink">
                {formatRange(plan.start)}
              </div>
              <div className="text-[10px] uppercase tracking-[0.1em] text-muted">
                {weekLabel}
              </div>
            </div>
            <button
              onClick={() => setOffset((o) => o + 1)}
              aria-label="Next week"
              className="cursor-pointer rounded-lg p-2 text-muted transition-colors duration-200 hover:bg-sand hover:text-ink"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <Card className="mt-6 overflow-hidden">
          {/* gap-px over a line-coloured bed: dividers land correctly at both 2
              and 4 columns, where per-cell borders leave stray half-width rules. */}
          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
            {[
              {
                label: "A day",
                value: `${avg.kcal.toLocaleString()} kcal`,
                sub: "lunch + dinner, per person",
              },
              { label: "Protein", value: `${avg.protein} g`, sub: "a day, per person" },
              {
                label: "Weekly shop",
                value: money(summary.total),
                sub: `${money(summary.perPersonPerDay)} per person a day`,
              },
              {
                label: "Sunday",
                value: `~${Math.round(prepMinutes / 5) * 5} min`,
                sub: `for all ${totalServings} portions`,
              },
            ].map((s) => (
              <div key={s.label} className="bg-surface px-4 py-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                  {s.label}
                </div>
                <div className="mt-1 font-display text-2xl leading-none text-ink">
                  {s.value}
                </div>
                <div className="mt-1 text-[11px] text-muted">{s.sub}</div>
              </div>
            ))}
          </div>
        </Card>
      </header>

      <nav className="no-print mb-8 flex flex-wrap gap-1 border-b border-line">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={active ? "page" : undefined}
              className={`relative flex cursor-pointer items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors duration-200 ${
                active ? "text-terracotta" : "text-muted hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
              {active ? (
                <motion.span
                  layoutId="tab-underline"
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-terracotta"
                  transition={{ duration: 0.25, ease: "easeOut" }}
                />
              ) : null}
            </button>
          );
        })}
      </nav>

      {/* The key remounts the panel on tab or week change, which re-runs `.rise`. */}
      <div key={`${tab}-${weekIndex}`} className="rise">
        {tab === "week" ? <MealGrid plan={plan} /> : null}
        {tab === "shop" ? <ShoppingList lines={lines} weekIndex={weekIndex} /> : null}
        {tab === "prep" ? <PrepTimeline plan={plan} /> : null}
        {tab === "cost" ? <CostView summary={summary} lines={lines} /> : null}
      </div>

      <footer className="mt-16 border-t border-line pt-6 text-[11px] leading-relaxed text-muted">
        <p>
          Calories and protein are calculated from raw ingredient weights. Prices are
          mid-range Canadian supermarket estimates — edit them in{" "}
          <code className="rounded bg-sand px-1 py-0.5">lib/ingredients.ts</code> and
          every week recalculates. Add or change dishes in{" "}
          <code className="rounded bg-sand px-1 py-0.5">lib/meals.ts</code> and the
          rotation picks them up on its own.
        </p>
      </footer>
    </main>
  );
}
