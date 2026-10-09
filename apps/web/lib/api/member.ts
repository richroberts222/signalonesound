import { acceptPolicySchema, patchProfileSchema } from "@signalone/validation";

import { validationFailed } from "../services/errors";
import type { MemberService } from "../services/member";
import type { createApiRoute } from "./handler";

// Route definitions for the member's own data (S1), kept separate from the Next.js route files so
// acceptance tests run the exact same definitions with a faked identity. Thin: each handler calls
// one service function with validated input. The user is always the authenticated caller.
export function memberRoutes(route: ReturnType<typeof createApiRoute>, getService: () => MemberService) {
  return {
    me: {
      GET: route({ auth: "required", handle: (ctx) => getService().getProfile(ctx) }),
      PATCH: route({
        auth: "required",
        input: { schema: patchProfileSchema },
        handle: (ctx, input) => getService().updateProfile(ctx, input),
      }),
      DELETE: route({ auth: "required", handle: (ctx) => getService().deleteAccount(ctx) }),
    },
    policyAcceptance: {
      POST: route({
        auth: "required",
        input: { schema: acceptPolicySchema },
        handle: (ctx, input) => getService().acceptPolicy(ctx, input),
      }),
    },
    exportData: {
      GET: route({ auth: "required", handle: (ctx) => getService().exportData(ctx) }),
    },
  };
}

/** What the signature check returns: only the fields the handler needs. */
export type VerifiedWebhookEvent = { type: string; userId: string | null };

/**
 * The Clerk webhook. It is public (Clerk calls it, with no session) and is authenticated by the
 * request signature, checked by the injected verifier against the exact bytes received. A request
 * that fails the check is rejected before anything is read or changed.
 */
export function clerkWebhookRoutes(
  route: ReturnType<typeof createApiRoute>,
  deps: { verify: (request: Request) => Promise<VerifiedWebhookEvent>; getService: () => MemberService },
) {
  return {
    POST: route({
      auth: "public",
      handle: async (_ctx, _input, request) => {
        let event: VerifiedWebhookEvent;
        try {
          event = await deps.verify(request);
        } catch {
          throw validationFailed("Invalid webhook");
        }
        if (event.type === "user.deleted" && event.userId) await deps.getService().handleUserDeleted(event.userId);
        return { received: true as const };
      },
    }),
  };
}
