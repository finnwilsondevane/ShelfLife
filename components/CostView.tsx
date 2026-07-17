"use client";

import { money } from "@/lib/planner";
import type { CostSummary } from "@/lib/planner";
import { AISLE_LABEL } from "@/lib/types";
import type { Aisle, ShoppingLine } from "@/lib/types";
import { Card, SectionHeading, SlotTag, Stat } from "./ui";

/** One hue, stepped by lightness — the aisles are one quantity, not six categories. */
const BAR_SHADES = [
  "#6f482c",
  "#8f5c38",
  "#a97d5d",
  "#c29d82",
  "#dcbea7",
  "#f5decc",
];

export function CostView({
  summary,
  lines,
}: {
  summary: CostSummary;
  lines: ShoppingLine[];
}) {
  const maxAisle = Math.max(...summary.byAisle.map((a) => a.cost));
  const maxMeal = Math.max(...summary.byMeal.map((m) => m.cost));
  // Priced against however many portions this plan actually makes, so the
  // comparison tracks the people count instead of assuming two.
  const servings = summary.byMeal.reduce((s, m) => s + m.servings, 0);
  const takeaway = servings * 18;

  return (
    <div className="space-y-8">
      <SectionHeading
        title="What the week costs"
        sub="Estimated against mid-range Canadian supermarket prices, for two people, fourteen lunches and fourteen dinners."
      />

      <Card className="overflow-hidden">
        <div className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Stat
            label="This week"
            value={money(summary.total)}
            sub={`${money(summary.freshCost)} at the till + ${money(summary.stapleCost)} cupboard`}
          />
          <Stat
            label="Per person, per day"
            value={money(summary.perPersonPerDay)}
            sub="both meals, all in"
          />
          <Stat
            label="Per portion"
            value={money(summary.perServing)}
            sub={`vs ~${money(18)} for the takeaway version`}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-line bg-sand/60 px-4 py-2.5">
          <h3 className="font-display text-base text-ink">Where the money goes</h3>
        </div>
        <div className="space-y-3 px-4 py-4">
          {summary.byAisle.map((row, i) => (
            <div key={row.aisle}>
              <div className="mb-1 flex items-baseline justify-between text-[13px]">
                <span className="text-ink">{AISLE_LABEL[row.aisle as Aisle]}</span>
                <span className="tabular-nums text-muted">
                  {money(row.cost)}
                  <span className="ml-2 text-[11px]">
                    {Math.round((row.cost / summary.total) * 100)}%
                  </span>
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-sand">
                <div
                  className="grow h-full rounded-full"
                  style={{
                    backgroundColor: BAR_SHADES[i % BAR_SHADES.length],
                    width: `${(row.cost / maxAisle) * 100}%`,
                    animationDelay: `${i * 60}ms`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-line bg-sand/60 px-4 py-2.5">
          <h3 className="font-display text-base text-ink">Cost by dish</h3>
          <p className="text-[11px] text-muted">
            Ingredients actually eaten, not pack prices — so this total sits below the
            till total.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                <th scope="col" className="px-4 py-2 font-bold">Dish</th>
                <th scope="col" className="px-4 py-2 font-bold">Portions</th>
                <th scope="col" className="px-4 py-2 text-right font-bold">Each</th>
                <th scope="col" className="px-4 py-2 text-right font-bold">Total</th>
                <th scope="col" className="w-1/3 px-4 py-2 font-bold">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {[...summary.byMeal]
                .sort((a, b) => b.cost - a.cost)
                .map((row, i) => (
                  <tr key={row.name} className="text-[13px]">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <SlotTag slot={row.slot as "lunch" | "dinner"} />
                        <span className="text-ink">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted">
                      {row.servings}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                      {money(row.each)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-ink">
                      {money(row.cost)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-sand">
                        <div
                          className="grow h-full rounded-full bg-terracotta"
                          style={{
                            width: `${(row.cost / maxMeal) * 100}%`,
                            animationDelay: `${i * 30}ms`,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="px-4 py-4">
          <h3 className="font-display text-base text-ink">Left in the fridge</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Shops sell whole packs, so this week you pay about{" "}
            <strong className="text-ink">{money(summary.leftoverValue)}</strong> for food
            the plan does not call for. It is not waste — the next rotation reuses the
            same core ingredients, so it gets eaten rather than thrown out. That is the
            whole reason the pool leans on one narrow shopping list.
          </p>
          <ul className="mt-3 space-y-1">
            {lines
              .filter((l) => !l.ingredient.staple)
              .map((l) => ({
                name: l.ingredient.name,
                spare: l.bought - l.needed,
                worth: (l.bought - l.needed) * (l.ingredient.packPrice / l.ingredient.packSize),
              }))
              .filter((l) => l.worth > 0.75)
              .sort((a, b) => b.worth - a.worth)
              .slice(0, 5)
              .map((l) => (
                <li
                  key={l.name}
                  className="flex justify-between text-[12px] text-muted"
                >
                  <span>{l.name}</span>
                  <span className="tabular-nums">{money(l.worth)}</span>
                </li>
              ))}
          </ul>
        </Card>

        <Card className="px-4 py-4">
          <h3 className="font-display text-base text-ink">Against eating out</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            Twenty-eight portions at roughly {money(18)} a head is{" "}
            <strong className="text-ink">{money(takeaway)}</strong> a week.
          </p>
          <div className="mt-4 space-y-2">
            {[
              { label: "This plan", value: summary.total, color: "bg-olive" },
              { label: "Takeaway", value: takeaway, color: "bg-terracotta" },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex justify-between text-[12px]">
                  <span className="text-ink">{row.label}</span>
                  <span className="tabular-nums text-muted">{money(row.value)}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-sand">
                  <div
                    className={`grow h-full rounded-full ${row.color}`}
                    style={{ width: `${(row.value / takeaway) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[12px] text-muted">
            Saving about{" "}
            <strong className="text-olive">{money(takeaway - summary.total)}</strong> a
            week, or {money((takeaway - summary.total) * 52)} a year.
          </p>
        </Card>
      </div>
    </div>
  );
}
