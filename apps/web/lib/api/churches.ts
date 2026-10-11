import { churchParamsSchema, churchSearchQuerySchema, saveChurchProfileSchema, saveServicesSchema } from "@signalone/validation";

import type { ChurchesService } from "../services/churches";
import type { createApiRoute } from "./handler";

// Route definitions for churches (S18), kept separate from the Next.js route files so acceptance tests run the exact
// same definitions with a faked identity. The read side is public (no sign-in, no identity read); saving needs a sign-in
// and the service decides who may manage which church, answering "not found" to everyone else.
export function churchRoutes(route: ReturnType<typeof createApiRoute>, getService: () => ChurchesService) {
  return {
    search: {
      GET: route({
        auth: "public",
        input: { schema: churchSearchQuerySchema, source: "query" },
        handle: (_ctx, input) => getService().search(input),
      }),
    },
    church: {
      GET: route({
        auth: "public",
        params: { schema: churchParamsSchema },
        handle: (_ctx, _input, _request, params) => getService().get(params.id),
      }),
    },
    profile: {
      PUT: route({
        auth: "required",
        params: { schema: churchParamsSchema },
        input: { schema: saveChurchProfileSchema },
        handle: (ctx, input, _request, params) => getService().saveProfile(ctx, params.id, input),
      }),
    },
    services: {
      PUT: route({
        auth: "required",
        params: { schema: churchParamsSchema },
        input: { schema: saveServicesSchema },
        handle: (ctx, input, _request, params) => getService().saveServices(ctx, params.id, input),
      }),
    },
  };
}
