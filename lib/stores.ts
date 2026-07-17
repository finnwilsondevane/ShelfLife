import type { ShoppingLine } from "./types";

/**
 * Finding real shops near a real address, using OpenStreetMap.
 *
 * Nominatim turns the address into coordinates; Overpass finds supermarkets
 * around them. Both are open, free, keyless and CORS-enabled, so this runs in
 * the browser on a static site with no backend and nothing to leak.
 *
 * What this deliberately does NOT do is fetch prices. No Canadian grocer
 * publishes a price API, and Google Places would not help — it returns a
 * restaurant-style $-$$$$ tier, not what chicken costs today. Prices come from
 * the user's own price book, pinned per store.
 */

export interface Store {
  /** OSM type+id, e.g. "node/1234" — stable across sessions. */
  id: string;
  name: string;
  brand?: string;
  street?: string;
  city?: string;
  lat: number;
  lon: number;
  /** Metres from the searched address. */
  distance: number;
}

export interface GeoResult {
  label: string;
  lat: number;
  lon: number;
}

// Nominatim asks for a real identifier and no more than one call a second.
// Both are honoured: this only ever runs on an explicit search.
const UA_PARAM = "ShelfLife-meal-planner";

export async function geocode(address: string, signal?: AbortSignal): Promise<GeoResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "ca");
  url.searchParams.set("email", UA_PARAM);

  const res = await fetch(url, { signal, headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Could not look up that address (${res.status}).`);
  const json = (await res.json()) as { display_name?: string; lat?: string; lon?: string }[];
  const hit = json[0];
  if (!hit?.lat || !hit?.lon) return null;
  return { label: hit.display_name ?? address, lat: Number(hit.lat), lon: Number(hit.lon) };
}

/** Straight-line metres. Good enough to sort a shortlist of local shops. */
function haversine(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLon = ((bLon - aLon) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

interface OverpassElement {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export async function findStores(
  lat: number,
  lon: number,
  radius = 3000,
  signal?: AbortSignal,
): Promise<Store[]> {
  // Ways as well as nodes: a big supermarket is usually mapped as a building
  // outline, not a point, and would otherwise be missed entirely.
  const q = `[out:json][timeout:25];(node["shop"~"^(supermarket|grocery)$"](around:${radius},${lat},${lon});way["shop"~"^(supermarket|grocery)$"](around:${radius},${lat},${lon}););out center 40;`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    body: `data=${encodeURIComponent(q)}`,
    signal,
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });
  if (!res.ok) throw new Error(`Store lookup failed (${res.status}). Try again shortly.`);
  const json = (await res.json()) as { elements?: OverpassElement[] };

  return (json.elements ?? [])
    .map((e): Store | null => {
      const t = e.tags ?? {};
      const p = e.center ?? { lat: e.lat, lon: e.lon };
      if (!p.lat || !p.lon || !e.type || !e.id) return null;
      const name = t.name ?? t.brand;
      // Unnamed shops are useless in a list you have to choose from.
      if (!name) return null;
      return {
        id: `${e.type}/${e.id}`,
        name,
        brand: t.brand,
        street: [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ") || undefined,
        city: t["addr:city"],
        lat: p.lat,
        lon: p.lon,
        distance: haversine(lat, lon, p.lat, p.lon),
      };
    })
    .filter((s): s is Store => s !== null)
    .sort((a, b) => a.distance - b.distance);
}

/** storeId -> ingredientId -> price paid for one pack. */
export type PriceBook = Record<string, Record<string, number>>;

/**
 * Costs a shopping list at one store, falling back to the built-in estimate for
 * anything unpriced. `known` is reported alongside the total so the UI can say
 * how much of the number is real and how much is still a guess — a comparison
 * built on two priced items out of twenty-five is not a comparison.
 */
export function basketAt(
  lines: ShoppingLine[],
  prices: Record<string, number> | undefined,
): { total: number; known: number; of: number } {
  let total = 0;
  let known = 0;
  for (const line of lines) {
    const own = prices?.[line.ingredient.id];
    if (own != null) known++;
    const packPrice = own ?? line.ingredient.packPrice;
    total += line.ingredient.staple
      ? line.needed * (packPrice / line.ingredient.packSize)
      : line.packs * packPrice;
  }
  return { total, known, of: lines.length };
}

export const formatDistance = (m: number) =>
  m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;

/**
 * Flipp carries most Canadian grocery flyers. Deep-linking a search for the
 * store name is the honest way to do this: the user reads the flyer at the
 * source, and types in what matters. Nothing is scraped.
 */
export const flyerUrl = (store: Store) =>
  `https://flipp.com/search/${encodeURIComponent(store.brand ?? store.name)}`;
