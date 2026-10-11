import type { FireMapService } from "../services/fire-map";
import type { createApiRoute } from "./handler";

// Route definition for the public Fire Map (S16), kept separate from the Next.js route file so acceptance tests
// run the exact same definition. Public: no sign-in.
export function fireMapRoutes(route: ReturnType<typeof createApiRoute>, getService: () => FireMapService) {
  return {
    get: {
      GET: route({
        auth: "public",
        handle: () => getService().getFireMap(),
      }),
    },
  };
}
