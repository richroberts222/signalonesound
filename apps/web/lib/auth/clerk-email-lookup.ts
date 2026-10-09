import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import type { EmailLookup } from "../messaging/email";

// Adapter: reads a person's primary email address from Clerk when a notification must be sent. The
// address is never copied into our own tables (docs/data-inventory.md).
export const clerkEmailLookup: EmailLookup = {
  async getPrimaryEmail(clerkUserId) {
    try {
      const user = await (await clerkClient()).users.getUser(clerkUserId);
      return user.primaryEmailAddress?.emailAddress ?? null;
    } catch {
      return null;
    }
  },
};
