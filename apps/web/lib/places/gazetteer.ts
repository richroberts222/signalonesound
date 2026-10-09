import data from "../../data/gazetteer.json";
import { normalizePlaceName, parsePlaceQuery } from "./place-name";

// Finding a position for a ZIP code or a "City, ST" from the US Census Bureau gazetteer (public domain),
// shipped with the app (S4, docs/features/s4-discover-web.md). No outside service is called, so nothing
// a visitor searches for ever leaves our servers, and it costs nothing. Positions are the centre of the
// ZIP area or place (rounded to about 100 metres): good enough to answer "within 10 miles", not for
// directions. Street-level positions can replace this later behind the same port.

export type Position = { lat: number; lng: number };
export type PlaceMatch = Position & { label: string; state: string | null };

type Place = { state: string; key: string; lat: number; lng: number; area: number };
type Loaded = { zips: Map<string, Position>; byKey: Map<string, Place[]> };

let loaded: Loaded | undefined;

function load(): Loaded {
  if (loaded) return loaded;
  const zips = new Map<string, Position>();
  for (const row of (data as { zip: string }).zip.split("|")) {
    const [zip, lat, lng] = row.split(",");
    zips.set(zip, { lat: Number(lat), lng: Number(lng) });
  }
  const byKey = new Map<string, Place[]>();
  for (const row of (data as { places: string }).places.split("|")) {
    const [state, key, lat, lng, area] = row.split(",");
    const place: Place = { state, key, lat: Number(lat), lng: Number(lng), area: Number(area) };
    for (const id of [`${state}|${key}`, key]) byKey.set(id, [...(byKey.get(id) ?? []), place]);
  }
  for (const list of byKey.values()) list.sort((a, b) => b.area - a.area);
  loaded = { zips, byKey };
  return loaded;
}

const title = (key: string): string => key.replace(/\b[a-z]/g, (c) => c.toUpperCase());

/** The centre of a ZIP area, or null if there is no such ZIP code. */
export function findZip(zip: string): PlaceMatch | null {
  const found = load().zips.get(zip.slice(0, 5));
  return found ? { ...found, label: `ZIP ${zip.slice(0, 5)}`, state: null } : null;
}

/** Places matching a city name, the largest first. With a state, only that state's. */
export function findPlaces(name: string, state: string | null, limit = 5): PlaceMatch[] {
  const key = normalizePlaceName(name);
  const list = load().byKey.get(state ? `${state}|${key}` : key) ?? [];
  const seen = new Set<string>();
  const out: PlaceMatch[] = [];
  for (const p of list) {
    const id = `${p.state}|${p.lat}|${p.lng}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ lat: p.lat, lng: p.lng, label: `${title(p.key)}, ${p.state}`, state: p.state });
    if (out.length >= limit) break;
  }
  return out;
}

/** Everything a typed place could mean: a ZIP code gives one match; a city may give several. */
export function searchPlaces(query: string, limit = 5): PlaceMatch[] {
  const parsed = parsePlaceQuery(query);
  if (!parsed) return [];
  if (parsed.kind === "zip") {
    const zip = findZip(parsed.zip);
    return zip ? [zip] : [];
  }
  return findPlaces(parsed.name, parsed.state, limit);
}

/** A position for an event's address: its ZIP code, otherwise its city and state; null if neither is known. */
export function locateAddress(address: { city: string; state: string; zip: string }): Position | null {
  const zip = findZip(address.zip);
  if (zip) return { lat: zip.lat, lng: zip.lng };
  const city = findPlaces(address.city, address.state, 1)[0];
  return city ? { lat: city.lat, lng: city.lng } : null;
}
