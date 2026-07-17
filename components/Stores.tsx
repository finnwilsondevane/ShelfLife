"use client";

import {
  AlertTriangle,
  ExternalLink,
  Loader2,
  MapPin,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { INGREDIENTS } from "@/lib/ingredients";
import { money } from "@/lib/planner";
import { basketAt, findStores, flyerUrl, formatDistance, geocode } from "@/lib/stores";
import type { PriceBook, Store } from "@/lib/stores";
import { AISLE_LABEL, AISLE_ORDER } from "@/lib/types";
import type { Aisle, Ingredient, ShoppingLine } from "@/lib/types";
import { Card, SectionHeading } from "./ui";

export function Stores({ lines }: { lines: ShoppingLine[] }) {
  const [address, setAddress] = useState("");
  const [found, setFound] = useState<Store[]>([]);
  const [label, setLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [saved, setSaved] = useState<Store[]>([]);
  const [book, setBook] = useState<PriceBook>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [priceQuery, setPriceQuery] = useState("");

  useEffect(() => {
    try {
      const s = window.localStorage.getItem("stores");
      const b = window.localStorage.getItem("priceBook");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring persisted state on mount is the intended use
      if (s) setSaved(JSON.parse(s));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring persisted state on mount is the intended use
      if (b) setBook(JSON.parse(b));
    } catch {
      // Unreadable: start empty.
    }
  }, []);

  const persist = (s: Store[], b: PriceBook) => {
    try {
      window.localStorage.setItem("stores", JSON.stringify(s));
      window.localStorage.setItem("priceBook", JSON.stringify(b));
    } catch {
      // Private browsing: works for this session.
    }
  };

  const search = async () => {
    if (!address.trim()) return;
    setBusy(true);
    setError(null);
    setFound([]);
    try {
      const geo = await geocode(address);
      if (!geo) {
        setError("No match for that address. Try adding the city or a postcode.");
        return;
      }
      setLabel(geo.label);
      const stores = await findStores(geo.lat, geo.lon);
      setFound(stores);
      if (!stores.length) {
        setError("No supermarkets mapped within 3 km. Try a nearby intersection instead.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addStore = (s: Store) => {
    setSaved((prev) => {
      if (prev.some((x) => x.id === s.id)) return prev;
      const next = [...prev, s];
      persist(next, book);
      return next;
    });
  };

  const removeStore = (id: string) => {
    setSaved((prev) => {
      const next = prev.filter((s) => s.id !== id);
      const b = { ...book };
      delete b[id];
      setBook(b);
      persist(next, b);
      return next;
    });
  };

  const setPrice = (storeId: string, ingId: string, value: string) => {
    setBook((prev) => {
      const next = { ...prev, [storeId]: { ...(prev[storeId] ?? {}) } };
      const n = Number(value);
      if (!value.trim() || Number.isNaN(n) || n <= 0) delete next[storeId][ingId];
      else next[storeId][ingId] = n;
      persist(saved, next);
      return next;
    });
  };

  const baskets = useMemo(
    () =>
      saved
        .map((s) => ({ store: s, ...basketAt(lines, book[s.id]) }))
        .sort((a, b) => a.total - b.total),
    [saved, book, lines],
  );
  const cheapest = baskets[0];
  // A store with nothing entered is costed entirely from the built-in estimates,
  // so it can "win" without a single real price behind it. Only rank once every
  // store has something real to say; otherwise the badge is worse than useless.
  const rankable = baskets.length > 1 && baskets.every((b) => b.known > 0);
  const uneven = rankable && new Set(baskets.map((b) => b.known)).size > 1;
  const unpriced = baskets.filter((b) => b.known === 0);

  // The price book covers the whole ingredient database, not just this
  // week's list — meals rotate week to week, so a price you enter for an
  // ingredient that isn't needed today is one you won't have to re-enter
  // when it comes back in rotation.
  const inThisWeek = useMemo(
    () => new Set(lines.map((l) => l.ingredient.id)),
    [lines],
  );
  const linesById = useMemo(
    () => new Map(lines.map((l) => [l.ingredient.id, l])),
    [lines],
  );
  const priceByAisle = useMemo(() => {
    const q = priceQuery.trim().toLowerCase();
    return AISLE_ORDER.map((aisle) => ({
      aisle,
      items: INGREDIENTS.filter(
        (i) => i.aisle === aisle && (!q || i.name.toLowerCase().includes(q)),
      ).sort((a, b) => Number(inThisWeek.has(b.id)) - Number(inThisWeek.has(a.id))),
    })).filter((g) => g.items.length);
  }, [priceQuery, inThisWeek]);

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Your stores"
        sub="Find the supermarkets near you, then keep a price book for each. The comparison is between shops you can actually walk into, using your prices — not a national average."
      />

      <Card className="flex items-start gap-2 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
        <p className="text-[11px] leading-relaxed text-ink">
          No Canadian grocer publishes a price API, and nothing here scrapes their sites.
          Store locations come from OpenStreetMap; the flyer links go to the source. Prices
          are the ones <strong>you</strong> enter, so they are right for your shops and stay
          right until the flyer changes.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <MapPin className="h-4 w-4 shrink-0 text-terracotta" aria-hidden />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Your address, intersection or postcode…"
            aria-label="Address"
            className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          />
          <button
            onClick={search}
            disabled={busy || !address.trim()}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-terracotta px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-ember disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Search className="h-3 w-3" aria-hidden />
            )}
            {busy ? "Looking…" : "Find stores"}
          </button>
        </div>
        {error ? (
          <p className="border-t border-line bg-ember/5 px-4 py-2 text-[11px] text-ember">
            {error}
          </p>
        ) : null}
        {label && !error ? (
          <p className="border-t border-line px-4 py-2 text-[11px] text-muted">
            Searching around {label}
          </p>
        ) : null}
      </Card>

      {found.length ? (
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-sand/60 px-4 py-2.5">
            <h3 className="font-display text-base text-ink">{found.length} nearby</h3>
            <p className="text-[11px] text-muted">Add the ones you actually shop at.</p>
          </div>
          <ul className="max-h-72 divide-y divide-line overflow-y-auto">
            {found.map((s) => {
              const on = saved.some((x) => x.id === s.id);
              return (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-ink">{s.name}</span>
                    <span className="block text-[11px] text-muted">
                      {formatDistance(s.distance)}
                      {s.street ? ` · ${s.street}` : ""}
                    </span>
                  </span>
                  <button
                    onClick={() => addStore(s)}
                    disabled={on}
                    className="shrink-0 cursor-pointer rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-muted transition-colors duration-200 hover:border-terracotta/40 hover:text-terracotta disabled:cursor-default disabled:border-olive/30 disabled:text-olive"
                  >
                    {on ? "Added" : "Add"}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {saved.length ? (
        <>
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-sand/60 px-4 py-2.5">
              <h3 className="font-display text-base text-ink">This week&apos;s basket</h3>
              <p className="text-[11px] text-muted">
                {rankable
                  ? "Your prices where you have them, the built-in estimate everywhere else."
                  : unpriced.length === baskets.length
                    ? "All estimates so far — enter prices below and this becomes a real comparison."
                    : `Not ranking yet: ${unpriced
                        .map((b) => b.store.name)
                        .join(" and ")} ${unpriced.length === 1 ? "has" : "have"} no prices, so ${unpriced.length === 1 ? "its total is" : "their totals are"} pure estimate.`}
              </p>
            </div>
            {uneven ? (
              <p className="border-b border-line bg-gold/5 px-4 py-2 text-[11px] leading-relaxed text-ink">
                Coverage is uneven, so the gap is part real and part estimate. Price the
                same items at each store for a comparison you can lean on.
              </p>
            ) : null}
            <ul className="divide-y divide-line">
              {baskets.map((b) => (
                <li key={b.store.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                      {b.store.name}
                      {rankable && b === cheapest ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-olive/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-olive">
                          <Star className="h-2 w-2" aria-hidden />
                          Cheapest
                        </span>
                      ) : null}
                    </span>
                    <span className="block text-[11px] text-muted">
                      {b.known} of {b.of} items priced ·{" "}
                      <a
                        href={flyerUrl(b.store)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 text-terracotta hover:underline"
                      >
                        flyer <ExternalLink className="h-2.5 w-2.5" aria-hidden />
                      </a>
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-display text-lg leading-none text-ink">
                      {money(b.total)}
                    </span>
                    {rankable && b !== cheapest ? (
                      <span className="block text-[11px] text-muted">
                        +{money(b.total - cheapest.total)}
                      </span>
                    ) : null}
                  </span>
                  <button
                    onClick={() => setEditing(editing === b.store.id ? null : b.store.id)}
                    className="shrink-0 cursor-pointer rounded-lg border border-line px-2.5 py-1 text-[11px] font-medium text-muted transition-colors duration-200 hover:border-terracotta/40 hover:text-terracotta"
                  >
                    {editing === b.store.id ? "Done" : "Prices"}
                  </button>
                  <button
                    onClick={() => removeStore(b.store.id)}
                    aria-label={`Remove ${b.store.name}`}
                    className="shrink-0 cursor-pointer rounded-lg p-1.5 text-muted transition-colors duration-200 hover:bg-ember/10 hover:text-ember"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {editing ? (
            <Card className="overflow-hidden">
              <div className="border-b border-line bg-sand/60 px-4 py-2.5">
                <h3 className="font-display text-base text-ink">
                  Price book · {saved.find((s) => s.id === editing)?.name}
                </h3>
                <p className="text-[11px] leading-relaxed text-muted">
                  {"What one pack costs at this store. Blank means fall back to the estimate. This is the full ingredient database, not just this week's list —"}{" "}
                  <strong>this week</strong>
                  {" items sort to the top of each aisle, but pricing anything else now means it's already known the next time it comes up in rotation."}
                </p>
              </div>
              <div className="border-b border-line px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
                  <input
                    value={priceQuery}
                    onChange={(e) => setPriceQuery(e.target.value)}
                    placeholder="Search all ingredients…"
                    aria-label="Search ingredients"
                    className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
                  />
                  <span className="shrink-0 text-[11px] tabular-nums text-muted">
                    {priceByAisle.reduce((n, g) => n + g.items.length, 0)} of{" "}
                    {INGREDIENTS.length}
                  </span>
                </div>
              </div>
              <div className="max-h-96 space-y-4 overflow-y-auto px-4 py-4">
                {priceByAisle.map(({ aisle, items }) => (
                  <div key={aisle}>
                    <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                      {AISLE_LABEL[aisle as Aisle]}
                    </div>
                    <ul className="mt-1.5 space-y-1">
                      {items.map((ingredient: Ingredient) => {
                        const line = linesById.get(ingredient.id);
                        return (
                          <li key={ingredient.id} className="flex items-center gap-3">
                            <label
                              htmlFor={`p-${ingredient.id}`}
                              className="flex min-w-0 flex-1 items-center gap-1.5 text-[13px] text-ink"
                            >
                              <span className="truncate">{ingredient.name}</span>
                              {line ? (
                                <span className="shrink-0 rounded-full bg-olive/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-olive">
                                  this week
                                </span>
                              ) : null}
                              <span className="shrink-0 text-[11px] text-muted">
                                {ingredient.packLabel}
                              </span>
                            </label>
                            <span className="shrink-0 text-[11px] text-muted">
                              est {money(ingredient.packPrice)}
                            </span>
                            <div className="flex shrink-0 items-center gap-1">
                              <span className="text-[11px] text-muted">$</span>
                              <input
                                id={`p-${ingredient.id}`}
                                type="number"
                                inputMode="decimal"
                                step="0.01"
                                min="0"
                                value={book[editing]?.[ingredient.id] ?? ""}
                                onChange={(e) =>
                                  setPrice(editing, ingredient.id, e.target.value)
                                }
                                placeholder="—"
                                className="w-20 rounded-lg border border-line bg-surface px-2 py-1 text-right text-[13px] tabular-nums text-ink outline-none focus:border-terracotta"
                              />
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
                {priceByAisle.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-muted">
                    No ingredients match &quot;{priceQuery}&quot;.
                  </p>
                ) : null}
              </div>
            </Card>
          ) : null}
        </>
      ) : (
        <Card className="px-6 py-10 text-center">
          <MapPin className="mx-auto h-5 w-5 text-muted" aria-hidden />
          <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-muted">
            No stores saved yet. Search your address above and add the shops you use — then
            price up a basket and see which one actually wins.
          </p>
        </Card>
      )}
    </div>
  );
}
