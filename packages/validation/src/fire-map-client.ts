import type { ApiClient } from "./api-client";
import { fireMapSchema } from "./fire-map";

// Typed operation for the Fire Map (S16), used identically by web and mobile. Public: no sign-in.
export function createFireMapClient(api: ApiClient) {
  return {
    getFireMap: () => api.request({ method: "GET", path: "/api/v1/fire-map", schema: fireMapSchema }),
  };
}
