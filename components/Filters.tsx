"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { INGREDIENTS } from "@/lib/ingredients";
import { DISHES_PER_SLOT } from "@/lib/planner";
import { perMealBounds, poolRange, topBlocker } from "@/lib/filters";
import type { PoolResult } from "@/lib/filters";
import { MEALS } from "@/lib/meals";
import {
  ALLERGENS,
  ALLERGEN_LABEL,
  AISLE_LABEL,
  AISLE_ORDER,
  DEFAULT_PREFS,
  DIET_LABEL,
} from "@/lib/types";
import type { Aisle, Diet, Prefs } from "@/lib/types";
import { Card } from "./ui";

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors duration-200 ${
        on
          ? "border-terracotta bg-terracotta text-white"
          : "border-line bg-surface text-muted hover:border-terracotta/40 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  hint,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  hint?: string;
  onChange: (n: number) => void;
}) {
  const id = `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-[13px] font-medium text-ink">
          {label}
        </label>
        <span className="text-[13px] tabular-nums text-terracotta">
          {value.toLocaleString()} {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-sand accent-terracotta"
      />
      {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
    </div>
  );
}

export function Filters({
  prefs,
  setPrefs,
  lunchPool,
  dinnerPool,
}: {
  prefs: Prefs;
  setPrefs: Dispatch<SetStateAction<Prefs>>;
  lunchPool: PoolResult;
  dinnerPool: PoolResult;
}) {
  const [open, setOpen] = useState(false);

  // Functional updates, not `{ ...prefs }`: two chips clicked in the same tick
  // would both read the same stale snapshot and the first change would vanish.
  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) =>
    setPrefs((p) => ({ ...p, [k]: v }));

  const toggleList = <K extends "allergies" | "dislikes">(
    k: K,
    item: Prefs[K][number],
  ) =>
    setPrefs((p) => {
      const list = p[k] as Prefs[K][number][];
      return {
        ...p,
        [k]: list.includes(item) ? list.filter((x) => x !== item) : [...list, item],
      };
    });

  const nLunch = lunchPool.passing.length;
  const nDinner = dinnerPool.passing.length;
  const thin = nLunch < DISHES_PER_SLOT || nDinner < DISHES_PER_SLOT;
  const dead = nLunch === 0 || nDinner === 0;

  const bounds = perMealBounds(prefs);
  // The dishes are written at fixed portions, so a day can only land inside
  // twice the pool's per-dish range. Stated up front — the slider travels far
  // wider than the pool can answer.
  const range = poolRange(MEALS);
  const dayMin = range.kcal.min * 2;
  const dayMax = range.kcal.max * 2;
  const reachable = prefs.kcal >= bounds.kcalMin * 2 && prefs.kcal <= bounds.kcalMax * 2;
  const inBand =
    prefs.kcal + (prefs.kcal * prefs.kcalTolerance) / 100 >= dayMin &&
    prefs.kcal - (prefs.kcal * prefs.kcalTolerance) / 100 <= dayMax;

  const activeCount =
    prefs.allergies.length +
    prefs.dislikes.length +
    (prefs.diet === "anything" ? 0 : 1);

  const byAisle = AISLE_ORDER.map((aisle) => ({
    aisle,
    items: INGREDIENTS.filter((i) => i.aisle === aisle && i.id !== "spices"),
  })).filter((g) => g.items.length);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-sand/50"
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-terracotta" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink">
            {prefs.people} {prefs.people === 1 ? "person" : "people"} ·{" "}
            {prefs.kcal.toLocaleString()} kcal · {DIET_LABEL[prefs.diet]}
            {activeCount ? ` · ${activeCount} filter${activeCount === 1 ? "" : "s"}` : ""}
          </div>
          <div
            className={`text-[11px] ${dead ? "text-ember" : thin ? "text-gold" : "text-muted"}`}
          >
            {nLunch} of 10 lunches · {nDinner} of 10 dinners qualify
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {thin ? (
        <div
          className={`flex items-start gap-2 border-t px-4 py-2.5 ${
            dead ? "border-ember/20 bg-ember/5" : "border-gold/20 bg-gold/5"
          }`}
        >
          <AlertTriangle
            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${dead ? "text-ember" : "text-gold"}`}
            aria-hidden
          />
          <p className="text-[11px] leading-relaxed text-ink">
            {dead ? (
              <>
                Nothing survives these filters, so there is no week to build. The biggest
                culprit is{" "}
                <strong>{topBlocker([...lunchPool.rejected, ...dinnerPool.rejected])}</strong>
                .
              </>
            ) : (
              <>
                A week wants {DISHES_PER_SLOT} lunches and {DISHES_PER_SLOT} dinners. With
                fewer, dishes repeat across more days — edible, but samey. Loosening{" "}
                <strong>{topBlocker([...lunchPool.rejected, ...dinnerPool.rejected])}</strong>{" "}
                would open up the most.
              </>
            )}
          </p>
        </div>
      ) : null}

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="space-y-6 border-t border-line px-4 py-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-5">
                  <div>
                    <span className="text-[13px] font-medium text-ink">Cooking for</span>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <Chip key={n} on={prefs.people === n} onClick={() => set("people", n)}>
                          {n}
                        </Chip>
                      ))}
                    </div>
                    <p className="mt-1 text-[11px] text-muted">
                      Scales every portion, the shopping list and the cost.
                    </p>
                  </div>

                  <Slider
                    label="Calories a day"
                    value={prefs.kcal}
                    min={1200}
                    max={4000}
                    step={50}
                    unit="kcal"
                    hint={`Lunch and dinner only — keeps dishes between ${bounds.kcalMin}–${bounds.kcalMax} kcal each.`}
                    onChange={(n) => set("kcal", n)}
                  />

                  <p
                    className={`-mt-3 text-[11px] leading-relaxed ${
                      inBand ? "text-muted" : "text-gold"
                    }`}
                  >
                    {inBand ? (
                      <>
                        The dishes are written at fixed portions running{" "}
                        {range.kcal.min}–{range.kcal.max} kcal each, so a day naturally
                        lands {dayMin.toLocaleString()}–{dayMax.toLocaleString()}.
                      </>
                    ) : (
                      <>
                        Nothing in the pool can hit {prefs.kcal.toLocaleString()} kcal —
                        the dishes only reach {dayMin.toLocaleString()}–
                        {dayMax.toLocaleString()} a day. Widen the window below, or edit
                        portions in lib/meals.ts.
                      </>
                    )}
                  </p>

                  <Slider
                    label="Calorie window"
                    value={prefs.kcalTolerance}
                    min={5}
                    max={50}
                    step={5}
                    unit="%"
                    hint={
                      reachable
                        ? "How far a dish may sit from target. Widen this first when the pool runs thin."
                        : `At ±${prefs.kcalTolerance}% nothing qualifies. Widen until the band reaches ${dayMin.toLocaleString()}–${dayMax.toLocaleString()}.`
                    }
                    onChange={(n) => set("kcalTolerance", n)}
                  />
                </div>

                <div className="space-y-5">
                  <Slider
                    label="Protein floor"
                    value={prefs.minProtein}
                    min={0}
                    max={250}
                    step={5}
                    unit="g a day"
                    hint={`Drops dishes under ${bounds.proteinMin} g a serving.`}
                    onChange={(n) => set("minProtein", n)}
                  />
                  <Slider
                    label="Carb cap"
                    value={prefs.maxCarbs}
                    min={20}
                    max={500}
                    step={10}
                    unit="g a day"
                    hint={`Drops dishes over ${bounds.carbsMax} g a serving.`}
                    onChange={(n) => set("maxCarbs", n)}
                  />
                  <Slider
                    label="Fat cap"
                    value={prefs.maxFat}
                    min={20}
                    max={250}
                    step={5}
                    unit="g a day"
                    hint={`Drops dishes over ${bounds.fatMax} g a serving.`}
                    onChange={(n) => set("maxFat", n)}
                  />
                </div>
              </div>

              <div className="border-t border-line pt-5">
                <span className="text-[13px] font-medium text-ink">Diet</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(Object.keys(DIET_LABEL) as Diet[]).map((d) => (
                    <Chip key={d} on={prefs.diet === d} onClick={() => set("diet", d)}>
                      {DIET_LABEL[d]}
                    </Chip>
                  ))}
                </div>
                {prefs.diet === "vegetarian" ? (
                  <p className="mt-1.5 text-[11px] leading-relaxed text-gold">
                    Fair warning: this pool was written around meat, so vegetarian leaves
                    almost nothing. Add veggie dishes to lib/meals.ts and it fills back up.
                  </p>
                ) : null}
              </div>

              <div className="border-t border-line pt-5">
                <span className="text-[13px] font-medium text-ink">Allergies</span>
                <p className="text-[11px] text-muted">
                  Excludes any dish containing the allergen, traced per ingredient.
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {ALLERGENS.map((a) => (
                    <Chip
                      key={a}
                      on={prefs.allergies.includes(a)}
                      onClick={() => toggleList("allergies", a)}
                    >
                      {ALLERGEN_LABEL[a]}
                    </Chip>
                  ))}
                </div>
              </div>

              <div className="border-t border-line pt-5">
                <span className="text-[13px] font-medium text-ink">
                  Food you don&apos;t like
                </span>
                <p className="text-[11px] text-muted">
                  Any dish using these drops out of the rotation.
                </p>
                <div className="mt-2 max-h-56 space-y-3 overflow-y-auto pr-1">
                  {byAisle.map(({ aisle, items }) => (
                    <div key={aisle}>
                      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                        {AISLE_LABEL[aisle as Aisle]}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {items.map((i) => (
                          <Chip
                            key={i.id}
                            on={prefs.dislikes.includes(i.id)}
                            onClick={() => toggleList("dislikes", i.id)}
                          >
                            {i.name}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-line pt-4">
                <button
                  onClick={() => setPrefs(DEFAULT_PREFS)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors duration-200 hover:bg-sand hover:text-ink"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden />
                  Reset to defaults
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  );
}
