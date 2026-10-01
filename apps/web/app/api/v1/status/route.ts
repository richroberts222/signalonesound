import { CURRENT_API_VERSION } from "@signalone/shared";
import { apiRoute } from "../../../../lib/api/route";

// Generic public liveness/version endpoint. Not a domain feature; it exists so
// clients can check connectivity and the API version, and proves the /api/v1
// routing convention end to end.
export const GET = apiRoute({
  auth: "public",
  handle: async () => ({ status: "ok" as const, version: CURRENT_API_VERSION }),
});
