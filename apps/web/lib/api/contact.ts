import { contactListQuerySchema, contactParamsSchema, createContactSchema, updateContactSchema } from "@signalone/validation";

import type { ContactService } from "../services/contact";
import type { createApiRoute } from "./handler";
import { addressOf } from "./moderation";

// Route definitions for the contact form and the admin Messages inbox (S15), kept separate from the Next.js
// route files so acceptance tests run the exact same definitions with a faked identity. The form route is
// public and reads no identity; every admin route answers "not found" to everyone who is not an admin.
export function contactRoutes(route: ReturnType<typeof createApiRoute>, getService: () => ContactService) {
  return {
    send: {
      POST: route({
        auth: "public",
        input: { schema: createContactSchema },
        handle: (_ctx, input, request) => getService().submit(input, addressOf(request)),
      }),
    },
    list: {
      GET: route({
        auth: "required",
        input: { schema: contactListQuerySchema, source: "query" },
        handle: (ctx, input) => getService().list(ctx, input.status),
      }),
    },
    one: {
      PATCH: route({
        auth: "required",
        params: { schema: contactParamsSchema },
        input: { schema: updateContactSchema },
        handle: (ctx, input, _request, params) => getService().setStatus(ctx, params.id, input),
      }),
      DELETE: route({
        auth: "required",
        params: { schema: contactParamsSchema },
        handle: (ctx, _input, _request, params) => getService().remove(ctx, params.id),
      }),
    },
  };
}
