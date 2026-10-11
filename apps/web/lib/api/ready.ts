import type { ReadyService } from "../services/ready";
import type { createApiRoute } from "./handler";

// Route definition for the readiness check, kept separate from the Next.js route file so acceptance tests run the
// exact same definition. Public: an uptime monitor calls it with no sign-in.
export function readyRoutes(route: ReturnType<typeof createApiRoute>, getService: () => ReadyService) {
  return {
    get: {
      GET: route({
        auth: "public",
        handle: () => getService().check(),
      }),
    },
  };
}
