"use client";

import { AlertTriangle, ExternalLink, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import raw from "@/lib/discovered.json";
import { searchDiscovered } from "@/lib/discovery";
import type { Discovered, DiscoveredIngredient, DiscoveryIndex } from "@/lib/discovery";
import { matchIngredient } from "@/lib/ingredient-match";
import { ALLERGEN_LABEL } from "@/lib/types";
import type { Prefs } from "@/lib/types";
import { Card, SectionHeading } from "./ui";

const index = raw as unknown as DiscoveryIndex;

function IngredientLine({ item }: { item: DiscoveredIngredient }) {
  const match = matchIngredient(item.name);
  return (
    <li className="flex items-center justify-between gap-2 text-[11px]">
      <span className="min-w-0 truncate text-ink">
        {item.amount ? `${Math.round(item.amount * 10) / 10} ${item.unit} ` : ""}
        {item.name}
      </span>
      <span
        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em] ${
          match ? "bg-olive/10 text-olive" : "bg-sand text-muted"
        }`}
      >
        {match ? match.ingredient.name : "estimate only"}
      </span>
    </li>
  );
}

function Row({ recipe, unverified }: { recipe: Discovered; unverified: string[] }) {
  const matched = useMemo(
    () => recipe.ingredients.filter((i) => matchIngredient(i.name)).length,
    [recipe.ingredients],
  );

  return (
    <li className="px-4 py-3">
      <a
        href={recipe.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex cursor-pointer items-start gap-3"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            {recipe.title}
            <ExternalLink className="h-3 w-3 shrink-0 text-muted" aria-hidden />
          </span>
          <span className="mt-0.5 block text-[11px] text-muted">
            {recipe.kcal} kcal · {recipe.protein} g protein · {recipe.carbs} g carbs ·{" "}
            {recipe.fat} g fat
            {recipe.readyInMinutes ? ` · ${recipe.readyInMinutes} min` : ""}
          </span>
          {unverified.length ? (
            <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-gold/10 px-2 py-0.5 text-[10px] text-gold">
              <AlertTriangle className="h-2.5 w-2.5 shrink-0" aria-hidden />
              {unverified.join(", ")} not verified — check the recipe yourself
            </span>
          ) : null}
        </span>
      </a>
      {recipe.ingredients.length ? (
        <details className="mt-2">
          <summary className="cursor-pointer select-none text-[11px] font-medium text-terracotta">
            {matched} of {recipe.ingredients.length} ingredients priced in your database
          </summary>
          <ul className="mt-1.5 space-y-1 border-l border-line pl-2.5">
            {recipe.ingredients.map((item, i) => (
              <IngredientLine key={`${item.name}-${i}`} item={item} />
            ))}
          </ul>
        </details>
      ) : null}
    </li>
  );
}

export function Discover({ prefs }: { prefs: Prefs }) {
  const [query, setQuery] = useState("");
  const matches = useMemo(
    () => searchDiscovered(index.recipes ?? [], prefs, query),
    [prefs, query],
  );

  const empty = !index.recipes?.length;

  return (
    <div className="space-y-6">
      <SectionHeading
        title="Discover"
        sub="Recipes from around the web, filtered against the same targets as your week. These link out to the original — they are not part of your shopping list or cost."
      />

      {empty ? (
        <Card className="px-6 py-12 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-terracotta" aria-hidden />
          <h3 className="mt-3 font-display text-xl text-ink">Nothing indexed yet</h3>
          <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-muted">
            The index fills up when the <strong>Fetch recipes</strong> workflow first
            runs — it needs a <code className="rounded bg-sand px-1">SPOONACULAR_KEY</code>{" "}
            secret on the repo. It is scheduled for Thursdays, or you can run it by hand
            from the Actions tab.
          </p>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the index…"
                aria-label="Search recipes"
                className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
              <span className="shrink-0 text-[11px] tabular-nums text-muted">
                {matches.length} of {index.recipes.length}
              </span>
            </div>
          </Card>

          <Card className="flex items-start gap-2 px-4 py-3">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
            <p className="text-[11px] leading-relaxed text-ink">
              Nutrition here comes from Spoonacular, not from the hand-checked ingredient
              data behind your week. Allergen flags only prove what a recipe is{" "}
              <em>free of</em> — anything unconfirmed is marked, never assumed safe. Read
              the source before you trust it with an allergy.
            </p>
          </Card>

          {matches.length === 0 ? (
            <Card className="px-6 py-10 text-center">
              <p className="text-sm text-muted">
                Nothing in the index matches your targets{query ? ` and "${query}"` : ""}.
                Widen the calorie window or clear the search.
              </p>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-line">
                {matches.slice(0, 40).map(({ recipe, unverified }) => (
                  <Row
                    key={recipe.id}
                    recipe={recipe}
                    unverified={unverified.map((a) => ALLERGEN_LABEL[a])}
                  />
                ))}
              </ul>
            </Card>
          )}

          {index.updatedAt ? (
            <p className="text-[11px] text-muted">
              Index last refreshed{" "}
              {new Date(index.updatedAt).toLocaleDateString("en-CA", {
                dateStyle: "medium",
              })}
              . Recipe data via Spoonacular.
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
