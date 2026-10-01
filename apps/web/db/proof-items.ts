import { and, asc, eq, sql } from "drizzle-orm";

import type { Database } from "./client";
import { withDbErrors } from "./errors";
import { proofItem } from "./schema";

// Data access for the generic proof feature (Issue 49). Server-only by
// convention (like all of db/): it takes the Database as a dependency, owns
// Drizzle queries and DatabaseError wrapping, and returns its own row type that
// the service maps to the public contract. Rows never reach clients.
export type ProofItemRow = typeof proofItem.$inferSelect;

export type ProofItemRepo = ReturnType<typeof createProofItemRepo>;

export function createProofItemRepo(db: Database) {
  return {
    listByOwner: (ownerId: string): Promise<ProofItemRow[]> =>
      withDbErrors("proofItem.listByOwner", () =>
        db
          .select()
          .from(proofItem)
          .where(eq(proofItem.ownerId, ownerId))
          .orderBy(asc(proofItem.createdAt), asc(proofItem.id)),
      ),

    countByOwner: (ownerId: string): Promise<number> =>
      withDbErrors("proofItem.countByOwner", async () => {
        const [row] = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(proofItem)
          .where(eq(proofItem.ownerId, ownerId));
        return row?.n ?? 0;
      }),

    findById: (id: string): Promise<ProofItemRow | null> =>
      withDbErrors("proofItem.findById", async () => {
        const [row] = await db.select().from(proofItem).where(eq(proofItem.id, id)).limit(1);
        return row ?? null;
      }),

    insert: (ownerId: string, label: string): Promise<ProofItemRow> =>
      withDbErrors("proofItem.insert", async () => {
        const [row] = await db.insert(proofItem).values({ ownerId, label }).returning();
        if (!row) throw new Error("insert returned no row");
        return row;
      }),

    /** Deletes only when the row still belongs to `ownerId`; returns whether a row was removed. */
    deleteOwned: (id: string, ownerId: string): Promise<boolean> =>
      withDbErrors("proofItem.deleteOwned", async () => {
        const rows = await db
          .delete(proofItem)
          .where(and(eq(proofItem.id, id), eq(proofItem.ownerId, ownerId)))
          .returning({ id: proofItem.id });
        return rows.length > 0;
      }),
  };
}
