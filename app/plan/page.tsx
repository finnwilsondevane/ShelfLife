"use client";

import { motion } from "framer-motion";
import {
  CalendarDays,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ShoppingBasket,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { CostView } from "@/components/CostView";
import { Discover } from "@/components/Discover";
import { Filters } from "@/components/Filters";
import { MealGrid } from "@/components/MealGrid";
import { PrepTimeline } from "@/components/PrepTimeline";
import { ShoppingList } from "@/components/ShoppingList";
import { Card } from "@/components/ui";
import {
  buildShoppingList,
  buildWeek,
  costSummary,
  currentWeekIndex,
  formatRange,
  money,
  prepDuration,
  prepPlan,
} from "@/lib/planner";
import { DEFAULT_PREFS, overrideKey } from "@/lib/types";
import type { Overrides, Prefs } from "@/lib/types";

const TABS = [
  { id: "week", label: "This week", icon: CalendarDays },
  { id: "shop", label: "Shopping list", icon: ShoppingBasket },
  { id: "prep", label: "Sunday prep", icon: ChefHat },
  { id: "cost", label: "Cost", icon: Wallet },
  { id: "discover", label: "Discover", icon: Sparkles },
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
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const weekIndex = baseWeek + offset;

  const [loaded, setLoaded] = useState(false);

  // Filters are the user's own settings, so they outlive the tab. Restored after
  // mount because localStorage has no server equivalent.
  useEffect(() => {
    let restored: Prefs | null = null;
    try {
      const saved = window.localStorage.getItem("prefs");
      // Merged over defaults so a saved blob from an older build cannot leave a
      // new field undefined and crash the filter maths.
      if (saved) restored = { ...DEFAULT_PREFS, ...JSON.parse(saved) };
    } catch {
      // Unreadable: fall back to defaults.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring persisted state on mount is the intended use
    if (restored) setPrefs(restored);
    setLoaded(true);
  }, []);

  // Persist as a effect of the value, not inside each handler: handlers use
  // functional updates, so they never hold the whole next object to save.
  // Gated on `loaded` so the first render cannot write defaults over saved prefs.
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem("prefs", JSON.stringify(prefs));
    } catch {
      // Private browsing: filters still work for this session.
    }
  }, [prefs, loaded]);

  const [overrides, setOverrides] = useState<Overrides>({});

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("swaps");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring persisted state on mount is the intended use
      if (saved) setOverrides(JSON.parse(saved));
    } catch {
      // Unreadable: start from the rotation's picks.
    }
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem("swaps", JSON.stringify(overrides));
    } catch {
      // Private browsing: swaps still work for this session.
    }
  }, [overrides, loaded]);

  const swap = (slot: "lunch" | "dinner", pickIndex: number, mealId: string) =>
    setOverrides((o) => ({ ...o, [overrideKey(weekIndex, slot, pickIndex)]: mealId }));

  const resetSwap = (slot: "lunch" | "dinner", pickIndex: number) =>
    setOverrides((o) => {
      const next = { ...o };
      delete next[overrideKey(weekIndex, slot, pickIndex)];
      return next;
    });

  const swapCount = Object.keys(overrides).filter((k) =>
    k.startsWith(`${weekIndex}:`),
  ).length;

  const plan = useMemo(
    () => buildWeek(weekIndex, prefs, overrides),
    [weekIndex, prefs, overrides],
  );
  const lines = useMemo(() => buildShoppingList(plan), [plan]);
  const summary = useMemo(() => costSummary(plan, lines, prefs.people), [plan, lines, prefs.people]);
  const prepMinutes = useMemo(() => prepDuration(prepPlan(plan)), [plan]);

  // byDay is empty when filters kill the week, so every average is guarded
  // against dividing into nothing.
  const avg = useMemo(() => {
    const sum = (pick: (p: (typeof plan.byDay)[number]) => number) =>
      plan.byDay.reduce((s, d) => s + pick(d), 0);
    const n = plan.byDay.length || 1;
    return {
      kcal: Math.round(sum((d) => d.lunch.kcalPerServing + d.dinner.kcalPerServing) / n),
      protein: Math.round(
        sum((d) => d.lunch.proteinPerServing + d.dinner.proteinPerServing) / n,
      ),
      carbs: Math.round(sum((d) => d.lunch.carbsPerServing + d.dinner.carbsPerServing) / n),
      fat: Math.round(sum((d) => d.lunch.fatPerServing + d.dinner.fatPerServing) / n),
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
            <p className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-terracotta">
              {`${prefs.people} ${prefs.people === 1 ? "person" : "people"} · lunches & dinners · your targets`}
              {swapCount ? (
                <button
                  onClick={() =>
                    setOverrides((o) =>
                      Object.fromEntries(
                        Object.entries(o).filter(([k]) => !k.startsWith(`${weekIndex}:`)),
                      ),
                    )
                  }
                  className="no-print cursor-pointer rounded-full bg-olive/10 px-2 py-0.5 text-[10px] tracking-[0.1em] text-olive transition-colors duration-200 hover:bg-olive/20"
                >
                  {swapCount} swapped · undo all
                </button>
              ) : null}
            </p>
            <Link
              href="/"
              className="mt-1.5 inline-block cursor-pointer font-display text-4xl leading-none text-ink transition-colors duration-200 hover:text-terracotta sm:text-5xl"
            >
              Shelf Life
            </Link>
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
          {/* gap-px over a line-coloured bed: dividers land correctly at every
              column count, where per-cell borders leave stray half-width rules. */}
          <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-6">
            {[
              {
                label: "A day",
                value: plan.viable ? `${avg.kcal.toLocaleString()} kcal` : "—",
                sub: `target ${prefs.kcal.toLocaleString()}`,
              },
              {
                label: "Protein",
                value: plan.viable ? `${avg.protein} g` : "—",
                sub: `floor ${prefs.minProtein} g`,
              },
              {
                label: "Carbs",
                value: plan.viable ? `${avg.carbs} g` : "—",
                sub: `cap ${prefs.maxCarbs} g`,
              },
              {
                label: "Fat",
                value: plan.viable ? `${avg.fat} g` : "—",
                sub: `cap ${prefs.maxFat} g`,
              },
              {
                label: "Weekly shop",
                value: plan.viable ? money(summary.total) : "—",
                sub: plan.viable ? `${money(summary.perPersonPerDay)} pp a day` : "no plan",
              },
              {
                label: "Sunday",
                value: plan.viable ? `~${Math.round(prepMinutes / 5) * 5} min` : "—",
                sub: plan.viable ? `for ${totalServings} portions` : "no plan",
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

        <div className="no-print mt-4">
          <Filters
            prefs={prefs}
            setPrefs={setPrefs}
            lunchPool={plan.lunchPool}
            dinnerPool={plan.dinnerPool}
          />
        </div>
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
        {/* Discovery does not depend on a buildable week — and is most useful
            when the filters have left you without one. */}
        {tab === "discover" ? <Discover prefs={prefs} /> : !plan.viable ? (
          <Card className="px-6 py-12 text-center">
            <h2 className="font-display text-2xl text-ink">No week to build</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted">
              {plan.lunchPool.passing.length === 0 && plan.dinnerPool.passing.length === 0
                ? "Your filters rule out every dish in the pool."
                : plan.lunchPool.passing.length === 0
                  ? "No lunch survives your filters, and a week needs both meals."
                  : "No dinner survives your filters, and a week needs both meals."}{" "}
              Open the filters above and loosen something — the calorie window is usually
              the cheapest one to widen.
            </p>
            <button
              onClick={() => setPrefs(DEFAULT_PREFS)}
              className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-200 hover:bg-sand"
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
              Reset filters
            </button>
          </Card>
        ) : (
          <>
            {tab === "week" ? (
              <MealGrid plan={plan} onSwap={swap} onReset={resetSwap} />
            ) : null}
            {tab === "shop" ? <ShoppingList lines={lines} weekIndex={weekIndex} /> : null}
            {tab === "prep" ? <PrepTimeline plan={plan} /> : null}
            {tab === "cost" ? <CostView summary={summary} lines={lines} /> : null}
          </>
        )}
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
