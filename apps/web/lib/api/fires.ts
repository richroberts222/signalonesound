import { fireParamsSchema } from "@signalone/validation";

import type { FiresService } from "../services/fires";
import type { createApiRoute } from "./handler";

// Route definitions for fires (S19), kept separate from the Next.js route files so acceptance tests run the exact same
// definitions with a faked identity. The user is always the authenticated caller; nothing takes a user id from the request.
export function firesRoutes(route: ReturnType<typeof createApiRoute>, getService: () => FiresService) {
  return {
    fire: {
      GET: route({
        auth: "required",
        params: { schema: fireParamsSchema },
        handle: (ctx, _input, _request, params) => getService().isFired(ctx, params.eventId),
      }),
      PUT: route({
        auth: "required",
        params: { schema: fireParamsSchema },
        handle: (ctx, _input, _request, params) => getService().fire(ctx, params.eventId),
      }),
      DELETE: route({
        auth: "required",
        params: { schema: fireParamsSchema },
        handle: (ctx, _input, _request, params) => getService().unfire(ctx, params.eventId),
      }),
    },
  };
}
