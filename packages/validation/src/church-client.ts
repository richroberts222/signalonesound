import type { ApiClient } from "./api-client";
import {
  churchProfileSchema,
  churchSchema,
  churchSearchResultSchema,
  savedServicesSchema,
  type ChurchSearchQuery,
  type SaveChurchProfileInput,
  type SaveServicesInput,
} from "./church";

// Typed operations for churches (S18), used identically by web and mobile. The read side is public; saving needs an
// approved manager of the church.
export function createChurchClient(api: ApiClient) {
  const org = (id: string) => encodeURIComponent(id);
  return {
    search: (query: Partial<ChurchSearchQuery> = {}) =>
      api.request({
        method: "GET",
        path: "/api/v1/churches",
        query: Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)])),
        schema: churchSearchResultSchema,
      }),
    get: (id: string) => api.request({ method: "GET", path: `/api/v1/churches/${org(id)}`, schema: churchSchema }),
    saveProfile: (id: string, input: SaveChurchProfileInput) =>
      api.request({ method: "PUT", path: `/api/v1/organizations/${org(id)}/profile`, body: input, schema: churchProfileSchema }),
    saveServices: (id: string, input: SaveServicesInput) =>
      api.request({ method: "PUT", path: `/api/v1/organizations/${org(id)}/services`, body: input, schema: savedServicesSchema }),
  };
}
