import { eq } from "drizzle-orm";

import type { Database } from "./client";
import { withDbErrors } from "./errors";
import { helloNote } from "./schema";

// Data access for the S0 hello note. Server-only by convention (like all of db/):
// takes the Database as a dependency, owns Drizzle queries and DatabaseError
// wrapping, and returns its own row type that the service maps to the contract.
export type HelloNoteRow = typeof helloNote.$inferSelect;

export type HelloRepo = ReturnType<typeof createHelloRepo>;

export function createHelloRepo(db: Database) {
  return {
    findByUser: (userId: string): Promise<HelloNoteRow | null> =>
      withDbErrors("helloNote.findByUser", async () => {
        const [row] = await db.select().from(helloNote).where(eq(helloNote.userId, userId)).limit(1);
        return row ?? null;
      }),

    /** One row per user: inserts, or replaces the note on conflict. */
    upsert: (userId: string, note: string): Promise<HelloNoteRow> =>
      withDbErrors("helloNote.upsert", async () => {
        const [row] = await db
          .insert(helloNote)
          .values({ userId, note })
          .onConflictDoUpdate({ target: helloNote.userId, set: { note, updatedAt: new Date() } })
          .returning();
        if (!row) throw new Error("upsert returned no row");
        return row;
      }),

    /** Removes only the given user's note; returns whether a row was removed. */
    deleteByUser: (userId: string): Promise<boolean> =>
      withDbErrors("helloNote.deleteByUser", async () => {
        const rows = await db.delete(helloNote).where(eq(helloNote.userId, userId)).returning({ id: helloNote.userId });
        return rows.length > 0;
      }),
  };
}
