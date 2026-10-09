import "server-only";

import { verifyWebhook } from "@clerk/nextjs/webhooks";

import type { VerifiedWebhookEvent } from "../api/member";

// Adapter: verifies a Clerk webhook signature (and its timestamp, so old requests cannot be
// replayed) against the signing secret in CLERK_WEBHOOK_SIGNING_SECRET, then returns only the
// event type and the Clerk user id. Throws when the signature or timestamp is not valid.
export async function verifyClerkWebhook(request: Request): Promise<VerifiedWebhookEvent> {
  // The standard Request is what Next.js hands a route handler; Clerk's type names a Next-specific one.
  const event = await verifyWebhook(request as Parameters<typeof verifyWebhook>[0]);
  const id = (event.data as { id?: unknown }).id;
  return { type: event.type, userId: typeof id === "string" ? id : null };
}
