import type { ApiClient } from "./api-client";
import {
  IDEMPOTENCY_KEY_HEADER,
  createdEventSchema,
  eventListSchema,
  eventSchema,
  eventStatusResultSchema,
  type CreateEventInput,
  type EventListQuery,
  type PatchEventInput,
} from "./event";

// Typed operations for events (S3), used identically by web and mobile. Creating needs a key that
// stays the same if the request is repeated, so a double tap or a retry never makes a second event.
export function createEventClient(api: ApiClient) {
  const base = "/api/v1";
  return {
    create: (orgId: string, input: CreateEventInput, idempotencyKey: string) =>
      api.request({
        method: "POST",
        path: `${base}/organizations/${encodeURIComponent(orgId)}/events`,
        body: input,
        headers: { [IDEMPOTENCY_KEY_HEADER]: idempotencyKey },
        schema: createdEventSchema,
      }),
    list: (orgId: string, query: Partial<EventListQuery> = {}) =>
      api.request({
        method: "GET",
        path: `${base}/organizations/${encodeURIComponent(orgId)}/events`,
        query: Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])),
        schema: eventListSchema,
      }),
    get: (id: string) => api.request({ method: "GET", path: `${base}/events/${encodeURIComponent(id)}`, schema: eventSchema }),
    update: (id: string, input: PatchEventInput) =>
      api.request({ method: "PATCH", path: `${base}/events/${encodeURIComponent(id)}`, body: input, schema: eventSchema }),
    publish: (id: string) => api.request({ method: "POST", path: `${base}/events/${encodeURIComponent(id)}/publish`, schema: eventStatusResultSchema }),
    cancel: (id: string) => api.request({ method: "POST", path: `${base}/events/${encodeURIComponent(id)}/cancel`, schema: eventStatusResultSchema }),
    remove: (id: string) => api.request({ method: "DELETE", path: `${base}/events/${encodeURIComponent(id)}`, schema: eventStatusResultSchema }),
  };
}
