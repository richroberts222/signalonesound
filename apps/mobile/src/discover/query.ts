import { roundPosition, type createDiscoverClient } from "@signalone/validation";

// Turns what the person chose on the Discover screen into the shared search request. Only the rounded
// position is ever sent (S5 AC3, about 1 km), and a radius is only sent with a position.
export type Origin = { lat: number; lng: number };
export type DateRange = "any" | "7d" | "30d";
export type Filters = { origin: Origin | null; radius: number | "any"; types: string[]; range: DateRange };
export type SearchRequest = Parameters<ReturnType<typeof createDiscoverClient>["searchEvents"]>[0];

const pad = (n: number) => String(n).padStart(2, "0");
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** The first and last day to search, as local dates; "any" means no date limit. */
export function dateRange(range: DateRange, now: Date): { from?: string; to?: string } {
  if (range === "any") return {};
  const days = range === "7d" ? 7 : 30;
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return { from: localDate(now), to: localDate(end) };
}

export function buildSearchRequest(filters: Filters, now: Date): SearchRequest {
  const request: SearchRequest = { ...dateRange(filters.range, now) };
  if (filters.origin) {
    request.lat = roundPosition(filters.origin.lat);
    request.lng = roundPosition(filters.origin.lng);
    request.radius = filters.radius;
  }
  if (filters.types.length > 0) request.types = filters.types;
  return request;
}
