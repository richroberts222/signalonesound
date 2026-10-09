import type { ApiClient } from "./api-client";
import { inviteArrivalSchema, inviteSchema, savedListSchema, savedResultSchema, type SavedListQuery } from "./saved";

// Typed operations for saved events and invites (S6), used identically by web and mobile.
export function createSavedClient(api: ApiClient) {
  const saved = (eventId: string) => `/api/v1/me/saved-events/${encodeURIComponent(eventId)}`;
  return {
    list: (query: Partial<SavedListQuery> = {}) =>
      api.request({
        method: "GET",
        path: "/api/v1/me/saved-events",
        query: Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])),
        schema: savedListSchema,
      }),
    isSaved: (eventId: string) => api.request({ method: "GET", path: saved(eventId), schema: savedResultSchema }),
    save: (eventId: string) => api.request({ method: "PUT", path: saved(eventId), schema: savedResultSchema }),
    unsave: (eventId: string) => api.request({ method: "DELETE", path: saved(eventId), schema: savedResultSchema }),
    createInvite: () => api.request({ method: "POST", path: "/api/v1/me/invites", schema: inviteSchema }),
    recordArrival: (token: string) =>
      api.request({ method: "POST", path: `/api/v1/invites/${encodeURIComponent(token)}/arrival`, schema: inviteArrivalSchema }),
  };
}
