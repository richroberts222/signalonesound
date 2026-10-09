import "server-only";

import { clerkClient } from "@clerk/nextjs/server";

import type { IdentityAdmin } from "../services/member";

// Adapter: removes a person's Clerk identity (docs/auth.md section 19). Deleting a user that is
// already gone is a success, so account deletion can be repeated safely.
export const clerkIdentityAdmin: IdentityAdmin = {
  async deleteUser(clerkUserId) {
    const client = await clerkClient();
    try {
      await client.users.deleteUser(clerkUserId);
    } catch (error) {
      if ((error as { status?: number }).status === 404) return;
      throw error;
    }
  },
};
