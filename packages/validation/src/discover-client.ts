import type { ApiClient } from "./api-client";
import { eventSearchResultSchema, placeSearchResultSchema, publicEventSchema, type EventSearchQuery } from "./discover";

// Typed operations for discovering events (S4), used identically by web and mobile. Public: no token
// is needed, and nothing identifies the person searching.
export function createDiscoverClient(api: ApiClient) {
  return {
    searchEvents: (query: Partial<Omit<EventSearchQuery, "types" | "limit">> & { types?: string[]; limit?: number }) =>
      api.request({
        method: "GET",
        path: "/api/v1/events",
        query: Object.fromEntries(
          Object.entries({ ...query, types: query.types?.length ? query.types.join(",") : undefined })
            .filter(([, v]) => v !== undefined && v !== "")
            .map(([k, v]) => [k, String(v)]),
        ),
        schema: eventSearchResultSchema,
      }),
    getEvent: (id: string) => api.request({ method: "GET", path: `/api/v1/events/${encodeURIComponent(id)}/public`, schema: publicEventSchema }),
    searchPlaces: (q: string) => api.request({ method: "GET", path: "/api/v1/places/search", query: { q }, schema: placeSearchResultSchema }),
  };
}
