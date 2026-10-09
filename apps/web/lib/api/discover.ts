import { eventSearchQuerySchema, placeSearchQuerySchema, publicEventParamsSchema } from "@signalone/validation";

import type { DiscoverService } from "../services/discover";
import type { createApiRoute } from "./handler";

// Route definitions for discovering events (S4), kept separate from the Next.js route files so
// acceptance tests run the exact same definitions. All public: no sign-in, no identity read.
export function discoverRoutes(route: ReturnType<typeof createApiRoute>, getService: () => DiscoverService) {
  return {
    search: {
      GET: route({
        auth: "public",
        input: { schema: eventSearchQuerySchema, source: "query" },
        handle: (_ctx, input) => getService().searchEvents(input),
      }),
    },
    event: {
      GET: route({
        auth: "public",
        params: { schema: publicEventParamsSchema },
        handle: (_ctx, _input, _request, params) => getService().getEvent(params.id),
      }),
    },
    places: {
      GET: route({
        auth: "public",
        input: { schema: placeSearchQuerySchema, source: "query" },
        handle: (_ctx, input) => getService().searchPlaces(input.q),
      }),
    },
  };
}
