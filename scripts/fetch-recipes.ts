/**
 * Pulls recipes from Spoonacular and writes lib/discovered.json.
 *
 * Runs only in CI, never in the browser: the key lives in a GitHub secret, and
 * a static site has nowhere to hide one. Output is committed, so Pages serves a
 * plain JSON file and the "search" is client-side over that.
 *
 *   SPOONACULAR_KEY=... npx tsx scripts/fetch-recipes.ts
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { normalize } from "../lib/discovery";
import type { Discovered, DiscoveryIndex, SpoonResult } from "../lib/discovery";

const KEY = process.env.SPOONACULAR_KEY;
const OUT = "lib/discovered.json";

// The free tier is ~150 calls a day and each search costs roughly one point per
// recipe returned, so this stays deliberately small. Queries are spread across
// meal types to keep the index varied rather than 100 chicken bowls.
const QUERIES = [
  { type: "main course", query: "high protein chicken" },
  { type: "main course", query: "high protein beef" },
  { type: "main course", query: "meal prep bowl" },
  { type: "lunch", query: "high protein lunch" },
  { type: "main course", query: "salmon" },
  { type: "main course", query: "vegetarian high protein" },
];

const PER_QUERY = 10;

async function search(q: (typeof QUERIES)[number]): Promise<SpoonResult[]> {
  const url = new URL("https://api.spoonacular.com/recipes/complexSearch");
  url.searchParams.set("apiKey", KEY!);
  url.searchParams.set("query", q.query);
  url.searchParams.set("type", q.type);
  url.searchParams.set("number", String(PER_QUERY));
  url.searchParams.set("addRecipeNutrition", "true");
  url.searchParams.set("instructionsRequired", "true");
  url.searchParams.set("sort", "popularity");

  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (res.status === 402) {
    throw new Error("Spoonacular daily quota exhausted (402). Try again tomorrow.");
  }
  if (res.status === 401) {
    throw new Error("Spoonacular rejected the key (401). Check the SPOONACULAR_KEY secret.");
  }
  if (!res.ok) throw new Error(`Spoonacular ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { results?: SpoonResult[] };
  return json.results ?? [];
}

async function main() {
  if (!KEY) {
    console.error("SPOONACULAR_KEY is not set — refusing to run.");
    process.exit(1);
  }

  // Start from what is already indexed so a quota failure or a thin day cannot
  // shrink the database. New results merge over old ones by id.
  const existing: Record<string, Discovered> = {};
  if (existsSync(OUT)) {
    try {
      const prev = JSON.parse(readFileSync(OUT, "utf8")) as DiscoveryIndex;
      for (const r of prev.recipes ?? []) existing[r.id] = r;
    } catch {
      console.warn("existing index unreadable — starting fresh");
    }
  }
  const before = Object.keys(existing).length;

  let added = 0;
  let skipped = 0;
  for (const q of QUERIES) {
    try {
      const results = await search(q);
      for (const raw of results) {
        const rec = normalize(raw);
        // normalize() returns null when a recipe has no usable calories; such a
        // recipe cannot answer a macro filter, so it has no business here.
        if (!rec) {
          skipped++;
          continue;
        }
        if (!existing[rec.id]) added++;
        existing[rec.id] = rec;
      }
      console.log(`  ${q.query} (${q.type}): ${results.length} results`);
    } catch (err) {
      // One bad query should not throw away the whole run.
      console.warn(`  ${q.query}: ${(err as Error).message}`);
      if (String(err).includes("401") || String(err).includes("quota")) break;
    }
  }

  const index: DiscoveryIndex = {
    recipes: Object.values(existing).sort((a, b) => b.protein - a.protein),
    updatedAt: new Date().toISOString(),
    source: "spoonacular",
  };
  writeFileSync(OUT, JSON.stringify(index, null, 2) + "\n");

  console.log(
    `\n${OUT}: ${before} -> ${index.recipes.length} recipes (+${added} new, ${skipped} unusable)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
