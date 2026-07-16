"use client";

import { Check, Info, Printer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { describeQty, unitPrice } from "@/lib/ingredients";
import { money } from "@/lib/planner";
import { AISLE_LABEL, AISLE_ORDER } from "@/lib/types";
import type { Aisle, ShoppingLine } from "@/lib/types";
import { Card, SectionHeading } from "./ui";

function Line({
  line,
  checked,
  onToggle,
}: {
  line: ShoppingLine;
  checked: boolean;
  onToggle: () => void;
}) {
  const { ingredient: ing } = line;
  const leftover = line.bought - line.needed;
  const leftoverWorth = leftover * unitPrice(ing);

  return (
    <li>
      <button
        onClick={onToggle}
        aria-pressed={checked}
        className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors duration-200 hover:bg-sand/50"
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors duration-200 ${
            checked
              ? "border-olive bg-olive text-white"
              : "border-line bg-surface"
          }`}
          aria-hidden
        >
          {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
        </span>

        <span className="min-w-0 flex-1">
          <span
            className={`block text-sm font-medium transition-colors duration-200 ${
              checked ? "text-muted line-through" : "text-ink"
            }`}
          >
            {ing.name}
          </span>
          <span className="block text-[11px] text-muted">
            {ing.staple ? (
              <>Uses about {describeQty(ing, line.needed)} from the cupboard</>
            ) : (
              <>
                {line.packs} × {ing.packLabel}
                {leftover > ing.packSize * 0.15 ? (
                  <> · {describeQty(ing, leftover)} spare ({money(leftoverWorth)})</>
                ) : null}
              </>
            )}
          </span>
        </span>

        <span
          className={`shrink-0 text-sm tabular-nums transition-colors duration-200 ${
            checked ? "text-muted" : "text-ink"
          }`}
        >
          {money(line.cost)}
        </span>
      </button>
    </li>
  );
}

export function ShoppingList({
  lines,
  weekIndex,
}: {
  lines: ShoppingLine[];
  weekIndex: number;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const storageKey = `shop-${weekIndex}`;

  // Ticks survive a refresh mid-aisle, and each week keeps its own list.
  // localStorage has no server equivalent, so the restore has to land after
  // mount — seeding during render would throw in SSR and desync hydration.
  useEffect(() => {
    let restored: Record<string, boolean> = {};
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) restored = JSON.parse(saved);
    } catch {
      // Unparseable or unavailable: start the week unticked.
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring persisted state on mount is the intended use
    setChecked(restored);
  }, [storageKey]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Private browsing: ticking still works for this session.
      }
      return next;
    });
  };

  const fresh = useMemo(() => lines.filter((l) => !l.ingredient.staple), [lines]);
  const staples = useMemo(() => lines.filter((l) => l.ingredient.staple), [lines]);

  const byAisle = useMemo(() => {
    const groups = new Map<Aisle, ShoppingLine[]>();
    for (const line of fresh) {
      const list = groups.get(line.ingredient.aisle) ?? [];
      list.push(line);
      groups.set(line.ingredient.aisle, list);
    }
    return AISLE_ORDER.filter((a) => groups.has(a)).map((aisle) => ({
      aisle,
      lines: groups.get(aisle)!,
    }));
  }, [fresh]);

  const total = lines.reduce((s, l) => s + l.cost, 0);
  const freshTotal = fresh.reduce((s, l) => s + l.cost, 0);
  const doneCount = fresh.filter((l) => checked[l.ingredient.id]).length;
  const remaining = fresh
    .filter((l) => !checked[l.ingredient.id])
    .reduce((s, l) => s + l.cost, 0);
  const progress = fresh.length ? (doneCount / fresh.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Saturday shop"
        sub="Everything the eight dishes need, in aisle order. Tick as you go — it saves as you shop."
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <div className="font-display text-3xl leading-none text-ink">
              {money(freshTotal)}
            </div>
            <p className="mt-1 text-xs text-muted">
              {fresh.length} items at the till · {money(total)} including cupboard staples
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-xl leading-none text-terracotta">
              {money(remaining)}
            </div>
            <p className="mt-1 text-xs text-muted">
              still to pick up · {doneCount}/{fresh.length} done
            </p>
          </div>
        </div>
        <div className="h-1.5 w-full bg-sand">
          <div
            className="h-full bg-olive transition-[width] duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {byAisle.map(({ aisle, lines: group }, i) => (
          <div key={aisle} className="rise" style={{ animationDelay: `${i * 50}ms` }}>
            <Card className="overflow-hidden">
              <div className="flex items-baseline justify-between border-b border-line bg-sand/60 px-4 py-2.5">
                <h3 className="font-display text-base text-ink">
                  {AISLE_LABEL[aisle]}
                </h3>
                <span className="text-xs tabular-nums text-muted">
                  {money(group.reduce((s, l) => s + l.cost, 0))}
                </span>
              </div>
              <ul className="divide-y divide-line">
                {group.map((line) => (
                  <Line
                    key={line.ingredient.id}
                    line={line}
                    checked={!!checked[line.ingredient.id]}
                    onToggle={() => toggle(line.ingredient.id)}
                  />
                ))}
              </ul>
            </Card>
          </div>
        ))}
      </div>

      {staples.length ? (
        <Card className="overflow-hidden">
          <div className="flex items-start gap-2 border-b border-line bg-sand/60 px-4 py-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
            <div>
              <h3 className="font-display text-base leading-tight text-ink">
                Check the cupboard
              </h3>
              <p className="text-[11px] leading-relaxed text-muted">
                You are not buying these every week. The cost shown is only the slice
                this week wears through, which is why it is counted separately from the
                till total.
              </p>
            </div>
          </div>
          <ul className="divide-y divide-line">
            {staples.map((line) => (
              <Line
                key={line.ingredient.id}
                line={line}
                checked={!!checked[line.ingredient.id]}
                onToggle={() => toggle(line.ingredient.id)}
              />
            ))}
          </ul>
        </Card>
      ) : null}

      <button
        onClick={() => window.print()}
        className="no-print inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink transition-colors duration-200 hover:bg-sand"
      >
        <Printer className="h-4 w-4" aria-hidden />
        Print the list
      </button>
    </div>
  );
}
