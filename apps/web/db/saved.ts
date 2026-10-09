import { and, count, eq, gte, sql } from "drizzle-orm";

import type { Database } from "./client";
import { withDbErrors } from "./errors";
import { event, inviteToken, savedEvent } from "./schema";

// Data access for saved events and invites (S6, docs/features/s6-saved-events-and-invites.md).
// Server-only by convention (like all of db/). A saved event links a person to a church event, which
// is sensitive: nothing here counts or lists who saved an event; every read is scoped to one person.
export type SavedRef = { eventId: string; savedAt: Date; startsAt: Date; past: boolean };
export type SavedCursor = { past: boolean; startsAt: Date; eventId: string };

export type SavedRepo = ReturnType<typeof createSavedRepo>;

export function createSavedRepo(db: Database) {
  return {
    countByUser: (userId: string): Promise<number> =>
      withDbErrors("saved.countByUser", async () => {
        const [row] = await db.select({ n: count() }).from(savedEvent).where(eq(savedEvent.userId, userId));
        return Number(row?.n ?? 0);
      }),

    isSaved: (userId: string, eventId: string): Promise<boolean> =>
      withDbErrors("saved.isSaved", async () => {
        const [row] = await db.select({ n: count() }).from(savedEvent).where(and(eq(savedEvent.userId, userId), eq(savedEvent.eventId, eventId)));
        return Number(row?.n ?? 0) > 0;
      }),

    /** Saving twice is the same as saving once. */
    save: (userId: string, eventId: string): Promise<void> =>
      withDbErrors("saved.save", async () => {
        await db.insert(savedEvent).values({ userId, eventId }).onConflictDoNothing();
      }),

    /** Removing something that is not saved succeeds quietly. */
    remove: (userId: string, eventId: string): Promise<void> =>
      withDbErrors("saved.remove", async () => {
        await db.delete(savedEvent).where(and(eq(savedEvent.userId, userId), eq(savedEvent.eventId, eventId)));
      }),

    /** One person's saved events: upcoming first (soonest first), then past ones; keyset-paged. */
    list: (userId: string, now: Date, cursor: SavedCursor | null, limit: number): Promise<SavedRef[]> =>
      withDbErrors("saved.list", async () => {
        const past = sql<boolean>`(${event.startsAt} < ${now})`;
        const where = [eq(savedEvent.userId, userId)];
        if (cursor) {
          where.push(sql`(${past}::int, ${event.startsAt}, ${event.id}) > (${cursor.past ? 1 : 0}::int, ${cursor.startsAt.toISOString()}::timestamptz, ${cursor.eventId}::uuid)`);
        }
        const rows = await db
          .select({ eventId: savedEvent.eventId, savedAt: savedEvent.savedAt, startsAt: event.startsAt, past })
          .from(savedEvent)
          .innerJoin(event, eq(event.id, savedEvent.eventId))
          .where(and(...where))
          .orderBy(sql`${past}::int`, event.startsAt, event.id)
          .limit(limit + 1);
        return rows.map((r) => ({ eventId: r.eventId, savedAt: r.savedAt, startsAt: r.startsAt, past: Boolean(r.past) }));
      }),

    /** Removes saved events that ended before the cutoff (30 days ago). Returns how many were removed. */
    purgeEnded: (cutoff: Date): Promise<number> =>
      withDbErrors("saved.purgeEnded", async () => {
        const result = await db.execute(
          sql`delete from saved_event using event e where e.id = saved_event.event_id and coalesce(e.ends_at, e.starts_at) < ${cutoff.toISOString()}::timestamptz returning saved_event.event_id`,
        );
        return result.rows.length;
      }),

    createInvite: (tokenHash: string, userId: string, expiresAt: Date): Promise<void> =>
      withDbErrors("invite.create", async () => {
        await db.insert(inviteToken).values({ tokenHash, createdBy: userId, expiresAt });
      }),

    countInvitesSince: (userId: string, since: Date): Promise<number> =>
      withDbErrors("invite.countSince", async () => {
        const [row] = await db
          .select({ n: count() })
          .from(inviteToken)
          .where(and(eq(inviteToken.createdBy, userId), gte(inviteToken.createdAt, since)));
        return Number(row?.n ?? 0);
      }),

    /** Counts one arrival if the link is real and has not expired. Records nothing about the visitor. */
    recordArrival: (tokenHash: string, now: Date): Promise<boolean> =>
      withDbErrors("invite.arrival", async () => {
        const result = await db.execute(
          sql`update invite_token set arrivals = arrivals + 1 where token_hash = ${tokenHash} and expires_at > ${now.toISOString()}::timestamptz returning token_hash`,
        );
        return result.rows.length > 0;
      }),

    purgeExpiredInvites: (now: Date): Promise<number> =>
      withDbErrors("invite.purgeExpired", async () => {
        const result = await db.execute(sql`delete from invite_token where expires_at < ${now.toISOString()}::timestamptz returning token_hash`);
        return result.rows.length;
      }),
  };
}
