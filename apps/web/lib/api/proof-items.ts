import { createProofItemSchema, deleteProofItemQuerySchema } from "@signalone/validation";

import type { ProofItemService } from "../services/proof-items";
import type { createApiRoute } from "./handler";

// Route definitions for the generic proof feature (Issue 49), kept separate from
// the Next.js route file so integration/acceptance tests can run the exact same
// definitions with a faked identity and the real or fake service. Thin: each
// handler calls one service function with validated input.
export function proofItemRoutes(
  route: ReturnType<typeof createApiRoute>,
  getService: () => ProofItemService,
) {
  return {
    GET: route({
      auth: "required",
      handle: (ctx) => getService().list(ctx),
    }),
    POST: route({
      auth: "required",
      input: { schema: createProofItemSchema },
      handle: (ctx, input) => getService().create(ctx, input),
    }),
    // The adapter has no path-parameter support, so the id travels in the query string.
    DELETE: route({
      auth: "required",
      input: { schema: deleteProofItemQuerySchema, source: "query" },
      handle: (ctx, input) => getService().remove(ctx, input),
    }),
  };
}
