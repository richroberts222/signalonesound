import {
  IDEMPOTENCY_KEY_HEADER,
  createEventSchema,
  eventListQuerySchema,
  eventParamsSchema,
  orgEventsParamsSchema,
  patchEventSchema,
} from "@signalone/validation";

import type { EventsService } from "../services/events";
import type { createApiRoute } from "./handler";

// Route definitions for events (S3), kept separate from the Next.js route files so acceptance tests
// run the exact same definitions with a faked identity. Thin: each handler calls one service function
// with validated input. The user is always the authenticated caller; the service decides who may do
// what, and answers "not found" for events the caller may not manage.
export function eventRoutes(route: ReturnType<typeof createApiRoute>, getService: () => EventsService) {
  return {
    orgEvents: {
      POST: route({
        auth: "required",
        params: { schema: orgEventsParamsSchema },
        input: { schema: createEventSchema },
        handle: (ctx, input, request, params) => getService().create(ctx, params.id, input, request.headers.get(IDEMPOTENCY_KEY_HEADER)),
      }),
      GET: route({
        auth: "required",
        params: { schema: orgEventsParamsSchema },
        input: { schema: eventListQuerySchema, source: "query" },
        handle: (ctx, input, _request, params) => getService().list(ctx, params.id, input),
      }),
    },
    event: {
      GET: route({
        auth: "required",
        params: { schema: eventParamsSchema },
        handle: (ctx, _input, _request, params) => getService().get(ctx, params.id),
      }),
      PATCH: route({
        auth: "required",
        params: { schema: eventParamsSchema },
        input: { schema: patchEventSchema },
        handle: (ctx, input, _request, params) => getService().update(ctx, params.id, input),
      }),
      DELETE: route({
        auth: "required",
        params: { schema: eventParamsSchema },
        handle: (ctx, _input, _request, params) => getService().remove(ctx, params.id),
      }),
    },
    publish: {
      POST: route({
        auth: "required",
        params: { schema: eventParamsSchema },
        handle: (ctx, _input, _request, params) => getService().publish(ctx, params.id),
      }),
    },
    cancel: {
      POST: route({
        auth: "required",
        params: { schema: eventParamsSchema },
        handle: (ctx, _input, _request, params) => getService().cancel(ctx, params.id),
      }),
    },
  };
}
