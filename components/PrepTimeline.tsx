"use client";

import { Clock, Flame, Refrigerator, Soup, UtensilsCrossed } from "lucide-react";
import { DAYS, prepDuration, prepPlan } from "@/lib/planner";
import type { WeekPlan } from "@/lib/types";
import { Card, SectionHeading } from "./ui";

const ICONS: Record<string, typeof Flame> = {
  prep: UtensilsCrossed,
  oven: Flame,
  stovetop: Soup,
  portion: Refrigerator,
};

const NOTES: Record<string, string> = {
  prep: "Get all of this done before anything goes on the heat. Chopping while a pan is hot is how Sunday turns into three hours.",
  oven: "One tray at a time at 425°F. Roast the things that want the same temperature back to back rather than reheating the oven.",
  stovetop: "Runs while the oven does. This is the block that actually sets how long Sunday takes.",
  portion: "Cool everything uncovered for 20 minutes before the lids go on, or condensation will make Thursday soggy.",
};

export function PrepTimeline({ plan }: { plan: WeekPlan }) {
  const blocks = prepPlan(plan);
  const wallClock = prepDuration(blocks);
  const naive = blocks.reduce((s, b) => s + b.minutes, 0);

  const dayOf = [...plan.lunches, ...plan.dinners].sort(
    (a, b) => a.meal.assembleMinutes - b.meal.assembleMinutes,
  );

  return (
    <div className="space-y-8">
      <SectionHeading
        title="Sunday"
        sub="Grouped by station instead of by recipe — you have one oven and two burners, so that is the thing that actually decides the order."
      />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <div className="font-display text-3xl leading-none text-ink">
              ~{Math.round(wallClock / 5) * 5} min
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Wall clock, because the oven and the stovetop run at the same time.
              Doing every step end to end would be {Math.round(naive / 5) * 5} min.
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-xl leading-none text-terracotta">
              {[...plan.lunches, ...plan.dinners].reduce((s, p) => s + p.servings, 0)}{" "}
              portions
            </div>
            <p className="mt-1 text-xs text-muted">out the other end</p>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {blocks.map((block, i) => {
          const Icon = ICONS[block.station] ?? Flame;
          return (
            <div
              key={block.station}
              className="rise"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <Card className="overflow-hidden">
                <div className="flex items-center gap-3 border-b border-line bg-sand/60 px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-terracotta/10 text-terracotta">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-base leading-tight text-ink">
                      {i + 1}. {block.label}
                    </h3>
                    <p className="text-[11px] text-muted">{NOTES[block.station]}</p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-muted">
                    {block.minutes} min
                  </span>
                </div>

                <ul className="divide-y divide-line">
                  {block.items.map((item, j) => (
                    <li key={j} className="flex gap-3 px-4 py-3">
                      <span className="mt-0.5 w-8 shrink-0 text-[11px] tabular-nums text-muted">
                        {item.minutes}m
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] leading-relaxed text-ink">
                          {item.text}
                        </p>
                        <p className="mt-0.5 text-[11px] text-terracotta">{item.meal}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          );
        })}
      </div>

      <section>
        <SectionHeading
          title="What is left on the day"
          sub="The whole point of Sunday. Nothing here is longer than ten minutes."
        />
        <Card className="overflow-hidden">
          <ul className="divide-y divide-line">
            {dayOf.map((planned) => (
              <li key={planned.meal.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-olive/10 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-olive">
                  <Clock className="h-3 w-3" aria-hidden />
                  {planned.meal.assembleMinutes}m
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{planned.meal.name}</p>
                  <p className="text-[11px] text-muted">
                    {planned.days.map((d) => DAYS[d]).join(" & ")} ·{" "}
                    {planned.meal.assemble.join(" ")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>
    </div>
  );
}
