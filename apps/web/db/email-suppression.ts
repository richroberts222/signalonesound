import { eq } from "drizzle-orm";

import type { Database } from "./client";
import { withDbErrors } from "./errors";
import { emailSuppression } from "./schema";

// Data access for the email suppression list (S14). Server-only by convention (like all of db/). It holds
// keyed hashes of addresses, never addresses; adding the same key twice is one entry.
export type EmailSuppressionRepo = ReturnType<typeof createEmailSuppressionRepo>;

export function createEmailSuppressionRepo(db: Database) {
  return {
    isSuppressed: (addressKey: string): Promise<boolean> =>
      withDbErrors("emailSuppression.isSuppressed", async () => {
        const [row] = await db.select({ key: emailSuppression.addressKey }).from(emailSuppression).where(eq(emailSuppression.addressKey, addressKey)).limit(1);
        return row !== undefined;
      }),

    add: (addressKey: string, reason: string): Promise<void> =>
      withDbErrors("emailSuppression.add", async () => {
        await db.insert(emailSuppression).values({ addressKey, reason }).onConflictDoNothing();
      }),
  };
}
