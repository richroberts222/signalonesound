import { and, count, eq, gte, sql } from "drizzle-orm";

import type { Database } from "./client";
import { withDbErrors } from "./errors";
import { eventFire } from "./schema";

// Data access for fires (S19, docs/features/s19-fire-recommend.md). Server-only by convention (like all of db/).
// A fire links a person to a church event, which is sensitive: nothing here lists who fired an event, and every
// read about a person is scoped to that person. The public total is counted with the event itself (db/events.ts).
export type FiresRepo = ReturnType<typeof createFiresRepo>;

export function createFiresRepo(db: Database) {
  return {
    isFired: (userId: string, eventId: string): Promise<boolean> =>
      withDbErrors("fires.isFired", async () => {
        const [row] = await db.select({ n: count() }).from(eventFire).where(and(eq(eventFire.userId, userId), eq(eventFire.eventId, eventId)));
        return Number(row?.n ?? 0) > 0;
      }),

    /** Giving a fire twice is the same as once. */
    fire: (userId: string, eventId: string): Promise<void> =>
      withDbErrors("fires.fire", async () => {
        await db.insert(eventFire).values({ userId, eventId }).onConflictDoNothing();
      }),

    /** Taking back a fire that was not given succeeds quietly. */
    unfire: (userId: string, eventId: string): Promise<void> =>
      withDbErrors("fires.unfire", async () => {
        await db.delete(eventFire).where(and(eq(eventFire.userId, userId), eq(eventFire.eventId, eventId)));
      }),

    /** How many fires one person has given since a moment (for the daily limit). */
    countSince: (userId: string, since: Date): Promise<number> =>
      withDbErrors("fires.countSince", async () => {
        const [row] = await db.select({ n: count() }).from(eventFire).where(and(eq(eventFire.userId, userId), gte(eventFire.firedAt, since)));
        return Number(row?.n ?? 0);
      }),

    /** Removes fires on events that ended before the cutoff (30 days ago). Returns how many were removed. */
    purgeEnded: (cutoff: Date): Promise<number> =>
      withDbErrors("fires.purgeEnded", async () => {
        const result = await db.execute(
          sql`delete from event_fire using event e where e.id = event_fire.event_id and coalesce(e.ends_at, e.starts_at) < ${cutoff.toISOString()}::timestamptz returning event_fire.event_id`,
        );
        return result.rows.length;
      }),
  };
}
