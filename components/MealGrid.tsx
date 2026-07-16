"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Clock, Snowflake } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { BY_ID, describeQty } from "@/lib/ingredients";
import {
  DAYS,
  PEOPLE,
  currentWeekIndex,
  money,
  needsFreezing,
  servingCost,
} from "@/lib/planner";
import type { PlannedMeal, WeekPlan } from "@/lib/types";
import { Card, SectionHeading, SlotTag } from "./ui";

const NEVER_CHANGES = () => () => {};

function DayColumn({
  day,
  lunch,
  dinner,
  date,
  isToday,
}: {
  day: string;
  lunch: PlannedMeal;
  dinner: PlannedMeal;
  date: string;
  isToday: boolean;
}) {
  const kcal = lunch.kcalPerServing + dinner.kcalPerServing;
  const protein = lunch.proteinPerServing + dinner.proteinPerServing;

  return (
    <Card
      className={`flex flex-col overflow-hidden ${
        isToday ? "ring-2 ring-terracotta" : ""
      }`}
    >
      <div
        className={`flex items-baseline justify-between border-b border-line px-3 py-2 ${
          day === "Sun" ? "bg-terracotta/5" : "bg-sand/60"
        }`}
      >
        <span className="font-display text-base text-ink">{day}</span>
        <span className="text-[11px] text-muted">{date}</span>
      </div>

      {day === "Sun" ? (
        <div className="border-b border-line bg-terracotta/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-terracotta">
          Prep day
        </div>
      ) : null}

      <div className="flex flex-1 flex-col divide-y divide-line">
        {[lunch, dinner].map((planned) => (
          <div key={planned.meal.id} className="flex-1 px-3 py-3">
            <SlotTag slot={planned.meal.slot} />
            <p className="mt-1.5 text-sm font-semibold leading-snug text-ink">
              {planned.meal.name}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {planned.kcalPerServing} kcal · {planned.proteinPerServing} g protein
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between bg-sand/40 px-3 py-2 text-[11px]">
        <span className="text-muted">Day total</span>
        <span className="font-semibold text-ink">
          {kcal.toLocaleString()} kcal · {protein} g
        </span>
      </div>
    </Card>
  );
}

function DishCard({ planned, index }: { planned: PlannedMeal; index: number }) {
  const [open, setOpen] = useState(false);
  const { meal } = planned;
  const freezeDays = needsFreezing(planned);

  return (
    <div className="rise" style={{ animationDelay: `${index * 40}ms` }}>
      <Card className="overflow-hidden">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full cursor-pointer items-start gap-3 px-4 py-4 text-left transition-colors duration-200 hover:bg-sand/50"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <SlotTag slot={meal.slot} />
              <span className="text-[11px] text-muted">
                {planned.days.map((d) => DAYS[d]).join(" & ")} · {planned.servings} portions
              </span>
            </div>
            <h3 className="mt-1.5 font-display text-lg leading-tight text-ink">
              {meal.name}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{meal.blurb}</p>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
              <span>
                <strong className="text-ink">{planned.kcalPerServing}</strong> kcal
              </span>
              <span>
                <strong className="text-ink">{planned.proteinPerServing} g</strong> protein
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden />
                <strong className="text-ink">{meal.assembleMinutes} min</strong> on the day
              </span>
              <span>
                <strong className="text-ink">{money(servingCost(meal))}</strong> a portion
              </span>
            </div>

            {freezeDays.length ? (
              <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-olive/10 px-2 py-1 text-[11px] text-olive">
                <Snowflake className="h-3 w-3 shrink-0" aria-hidden />
                Freeze the {freezeDays.map((d) => DAYS[d]).join(" & ")} portions on Sunday —
                past {meal.keepsDays} days in the fridge
              </p>
            ) : null}
          </div>

          <ChevronDown
            className={`mt-1 h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          />
        </button>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="grid gap-6 border-t border-line px-4 py-4 sm:grid-cols-2">
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                    Per portion
                  </h4>
                  <ul className="mt-2 space-y-1">
                    {meal.ingredients.map(({ id, qty }) => {
                      const ing = BY_ID[id];
                      if (!ing) return null;
                      return (
                        <li
                          key={id}
                          className="flex justify-between gap-3 text-[13px] text-ink"
                        >
                          <span>{ing.name}</span>
                          <span className="shrink-0 text-muted">
                            {describeQty(ing, qty)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-3 border-t border-line pt-2 text-[11px] text-muted">
                    Buy for {planned.servings} portions — that is {planned.days.length}{" "}
                    {planned.days.length === 1 ? "day" : "days"} for {PEOPLE}.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
                      Sunday
                    </h4>
                    <ol className="mt-2 space-y-2">
                      {meal.prep.map((step, i) => (
                        <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed">
                          <span className="mt-0.5 shrink-0 font-mono text-[10px] text-muted">
                            {step.minutes}m
                          </span>
                          <span className="text-ink">{step.text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-[0.14em] text-terracotta">
                      On the day · {meal.assembleMinutes} min
                    </h4>
                    <ol className="mt-2 space-y-1.5">
                      {meal.assemble.map((step, i) => (
                        <li
                          key={i}
                          className="flex gap-2.5 text-[13px] leading-relaxed text-ink"
                        >
                          <span className="mt-0.5 shrink-0 font-mono text-[10px] text-muted">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </Card>
    </div>
  );
}

export function MealGrid({ plan }: { plan: WeekPlan }) {
  // -1 on the server (it cannot know "today"), resolved on the client after
  // hydration. Reading the clock during render would desync the two.
  const todayIndex = useSyncExternalStore(
    NEVER_CHANGES,
    () => {
      const now = new Date();
      return currentWeekIndex(now) === plan.weekIndex ? now.getDay() : -1;
    },
    () => -1,
  );

  const dishes = [...plan.lunches, ...plan.dinners];

  return (
    <div className="space-y-10">
      <section>
        <SectionHeading
          title="The week"
          sub="Shop Saturday, cook Sunday, eat through to next Saturday. Each dish covers a couple of days, which is what keeps the shop small and the Sunday short."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {plan.byDay.map((d, i) => (
            <DayColumn
              key={i}
              day={DAYS[i]}
              lunch={d.lunch}
              dinner={d.dinner}
              isToday={i === todayIndex}
              date={new Date(plan.start.getTime() + i * 86400000).toLocaleDateString(
                "en-CA",
                { month: "short", day: "numeric", timeZone: "UTC" },
              )}
            />
          ))}
        </div>
      </section>

      <section>
        <SectionHeading
          title="The eight dishes"
          sub="Open any one for its per-portion ingredients, what you do to it on Sunday, and what is left to do on the day."
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {dishes.map((planned, i) => (
            <DishCard key={planned.meal.id} planned={planned} index={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
