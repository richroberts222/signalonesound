import { z } from "zod";

import { UnauthenticatedError } from "../auth/errors";
import { addressKey } from "../messaging/guards";
import type { EmailSuppressionRepo } from "../../db/email-suppression";
import type { createApiRoute } from "./handler";

// Internal endpoint that records an address that bounced or complained (S14). It is called by the email
// provider's notification forwarder (connected when the provider account is set up) with the same secret
// the scheduler uses; it refuses everything else. The address is turned into a keyed hash before it is
// stored and is never echoed back.
export const suppressionRequestSchema = z
  .object({
    address: z.string().trim().min(3).max(254).regex(/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/, "Enter an email address"),
    reason: z.enum(["bounce", "complaint"]),
  })
  .strict();

export function emailSuppressionRoutes(
  route: ReturnType<typeof createApiRoute>,
  deps: { authorized: (request: Request) => boolean; repo: () => EmailSuppressionRepo; salt: () => string },
) {
  return {
    suppress: {
      POST: route({
        auth: "public",
        input: { schema: suppressionRequestSchema },
        handle: async (_ctx, input, request) => {
          if (!deps.authorized(request)) throw new UnauthenticatedError();
          await deps.repo().add(addressKey(input.address, deps.salt()), input.reason);
          return { recorded: true as const };
        },
      }),
    },
  };
}
