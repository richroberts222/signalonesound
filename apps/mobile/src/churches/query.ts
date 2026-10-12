import { roundPosition, type createChurchClient } from "@signalone/validation";

// Turns what the person chose on the Find a Church screen into the shared search request (S18 on the phone).
// Only the rounded position is ever sent (about 1 km), a radius only goes with a position, and typed words
// go as the name-or-city search.
export type Origin = { lat: number; lng: number };
export type ChurchFilters = { origin: Origin | null; radius: number; text: string };
export type ChurchSearchRequest = NonNullable<Parameters<ReturnType<typeof createChurchClient>["search"]>[0]>;

export const CHURCH_RADIUS_CHOICES = [10, 25, 50, 100] as const;

export function buildChurchRequest(filters: ChurchFilters): ChurchSearchRequest {
  const request: ChurchSearchRequest = {};
  if (filters.origin) {
    request.lat = roundPosition(filters.origin.lat);
    request.lng = roundPosition(filters.origin.lng);
    request.radius = filters.radius;
  }
  const text = filters.text.trim();
  if (text !== "") request.q = text;
  return request;
}
