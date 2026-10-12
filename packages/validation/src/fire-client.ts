import type { ApiClient } from "./api-client";
import { fireResultSchema } from "./fire";

// Typed operations for fires (S19), used identically by web and mobile. The caller is always the signed-in member.
export function createFireClient(api: ApiClient) {
  const path = (eventId: string) => `/api/v1/me/fires/${encodeURIComponent(eventId)}`;
  return {
    isFired: (eventId: string) => api.request({ method: "GET", path: path(eventId), schema: fireResultSchema }),
    fire: (eventId: string) => api.request({ method: "PUT", path: path(eventId), schema: fireResultSchema }),
    unfire: (eventId: string) => api.request({ method: "DELETE", path: path(eventId), schema: fireResultSchema }),
  };
}
