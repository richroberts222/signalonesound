import { and, count, desc, eq, gte } from "drizzle-orm";

import type { Database } from "./client";
import { withDbErrors } from "./errors";
import { contactMessage } from "./schema";

// Data access for the contact form's messages (S15, docs/features/s15-public-pages.md). Server-only by
// convention (like all of db/). A message holds what the person typed; the address is kept only as a keyed
// hash, to limit how many messages one person sends in a day.
export type ContactRow = typeof contactMessage.$inferSelect;
export type NewContact = { topic: string; name: string; replyEmail: string | null; message: string; addressKey: string };
export type ContactRepo = ReturnType<typeof createContactRepo>;

export function createContactRepo(db: Database) {
  return {
    /** Stores the message unless this address key already sent `max` since `since`; false when over the limit. */
    createLimited: (input: NewContact, max: number, since: Date): Promise<boolean> =>
      withDbErrors("contact.createLimited", async () => {
        const [row] = await db.select({ n: count() }).from(contactMessage).where(and(eq(contactMessage.addressKey, input.addressKey), gte(contactMessage.createdAt, since)));
        if (Number(row?.n ?? 0) >= max) return false;
        await db.insert(contactMessage).values(input);
        return true;
      }),

    list: (status: "new" | "done" | "all"): Promise<ContactRow[]> =>
      withDbErrors("contact.list", async () => {
        const query = db.select().from(contactMessage);
        const rows = status === "all" ? await query.orderBy(desc(contactMessage.createdAt)) : await query.where(eq(contactMessage.status, status)).orderBy(desc(contactMessage.createdAt));
        return rows;
      }),

    setStatus: (id: string, status: "new" | "done"): Promise<ContactRow | null> =>
      withDbErrors("contact.setStatus", async () => {
        const [row] = await db.update(contactMessage).set({ status }).where(eq(contactMessage.id, id)).returning();
        return row ?? null;
      }),

    remove: (id: string): Promise<boolean> =>
      withDbErrors("contact.remove", async () => {
        const rows = await db.delete(contactMessage).where(eq(contactMessage.id, id)).returning({ id: contactMessage.id });
        return rows.length > 0;
      }),
  };
}
