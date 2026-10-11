import { pinSchema, type Pin } from "@signalone/validation";

import { roundPin } from "./coordinates";

// Looking a place up by name for the location picker (S17). The answer comes from a search service the browser asks
// directly (map-config.ts), so it is untrusted: every result is checked before it can become a pin, and the server
// checks the pin again when the event is saved. Searching happens only when the organizer presses Search; the
// service's usage policy forbids search-as-you-type.

export type PlaceResult = { label: string; pin: Pin };

const MAX_RESULTS = 6;
const MAX_LABEL = 140;

/** Turns the service's answer into places, dropping anything that is not a name with a real position. */
export function parsePlaces(json: unknown): PlaceResult[] {
  if (!Array.isArray(json)) return [];
  const places: PlaceResult[] = [];
  for (const item of json) {
    if (typeof item !== "object" || item === null) continue;
    const { display_name: name, lat, lon } = item as Record<string, unknown>;
    if (typeof name !== "string" || name.trim() === "") continue;
    const pin = pinSchema.safeParse({ lat: Number(lat), lng: Number(lon) });
    if (!pin.success || typeof lat === "boolean" || typeof lon === "boolean" || lat === null || lon === null || lat === "" || lon === "") continue;
    places.push({ label: name.trim().slice(0, MAX_LABEL), pin: roundPin(pin.data) });
    if (places.length === MAX_RESULTS) break;
  }
  return places;
}

export type SearchDeps = { baseUrl: string; fetchImpl?: typeof fetch; signal?: AbortSignal };

/** Searches by name. Throws when the service cannot be reached or answers with an error, so the form can say so. */
export async function searchPlaces(query: string, { baseUrl, fetchImpl = fetch, signal }: SearchDeps): Promise<PlaceResult[]> {
  const text = query.trim();
  if (text === "") return [];
  const url = `${baseUrl.replace(/\/+$/, "")}/search?format=jsonv2&limit=${MAX_RESULTS}&accept-language=en&q=${encodeURIComponent(text)}`;
  const response = await fetchImpl(url, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Place search failed (${response.status})`);
  return parsePlaces(await response.json());
}
