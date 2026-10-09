import { inviteTokenParamsSchema, savedEventParamsSchema, savedListQuerySchema } from "@signalone/validation";

import { UnauthenticatedError } from "../auth/errors";
import type { SavedService } from "../services/saved";
import type { createApiRoute } from "./handler";

// Route definitions for saved events and invites (S6), kept separate from the Next.js route files so
// acceptance tests run the exact same definitions with a faked identity. The user is always the
// authenticated caller; nothing takes a user id from the request.
export function savedRoutes(route: ReturnType<typeof createApiRoute>, getService: () => SavedService) {
  return {
    saved: {
      GET: route({
        auth: "required",
        params: { schema: savedEventParamsSchema },
        handle: (ctx, _input, _request, params) => getService().isSaved(ctx, params.eventId),
      }),
      PUT: route({
        auth: "required",
        params: { schema: savedEventParamsSchema },
        handle: (ctx, _input, _request, params) => getService().save(ctx, params.eventId),
      }),
      DELETE: route({
        auth: "required",
        params: { schema: savedEventParamsSchema },
        handle: (ctx, _input, _request, params) => getService().unsave(ctx, params.eventId),
      }),
    },
    list: {
      GET: route({
        auth: "required",
        input: { schema: savedListQuerySchema, source: "query" },
        handle: (ctx, input) => getService().list(ctx, input),
      }),
    },
    invites: {
      POST: route({ auth: "required", handle: (ctx) => getService().createInvite(ctx) }),
    },
    arrival: {
      // Public: someone who followed an invite link and has no account yet.
      POST: route({
        auth: "public",
        params: { schema: inviteTokenParamsSchema },
        handle: (_ctx, _input, _request, params) => getService().recordArrival(params.token),
      }),
    },
  };
}

/**
 * Scheduled jobs. The platform scheduler calls them with GET and a secret; a call without the right
 * secret is refused before anything runs. When no secret is configured every call is refused.
 */
export function jobRoutes(
  route: ReturnType<typeof createApiRoute>,
  deps: { authorized: (request: Request) => boolean; retention: () => Promise<unknown> },
) {
  return {
    retention: {
      GET: route({
        auth: "public",
        handle: async (_ctx, _input, request) => {
          if (!deps.authorized(request)) throw new UnauthenticatedError();
          return deps.retention();
        },
      }),
    },
  };
}
