import { putHelloSchema } from "@signalone/validation";

import type { HelloService } from "../services/hello";
import type { createApiRoute } from "./handler";

// Route definitions for the S0 hello note, kept separate from the Next.js route
// file so acceptance tests run the exact same definitions with a faked identity.
// Thin: each handler calls one service function with validated input.
export function helloRoutes(route: ReturnType<typeof createApiRoute>, getService: () => HelloService) {
  return {
    GET: route({
      auth: "required",
      handle: (ctx) => getService().get(ctx),
    }),
    PUT: route({
      auth: "required",
      input: { schema: putHelloSchema },
      handle: (ctx, input) => getService().put(ctx, input),
    }),
  };
}
