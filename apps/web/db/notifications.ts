import { and, asc, count, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";

import type { Database } from "./client";
import { withDbErrors } from "./errors";
import { alertRule, notificationQueue, orgMute, pushToken, userProfile } from "./schema";

// Data access for alerts, push tokens and the notification queue (S7, docs/features/s7-alerts-and-push.md).
// Server-only by convention (like all of db/). Interest in a place and in kinds of gatherings is
// sensitive: every member-facing read is scoped to one person, and a queue row holds no message text.
export type RuleRow = typeof alertRule.$inferSelect;
export type QueueRow = typeof notificationQueue.$inferSelect;
export type NewRule = Omit<typeof alertRule.$inferInsert, "id" | "createdAt">;
export type RulePatch = Partial<Pick<RuleRow, "placeLabel" | "lat" | "lng" | "radiusMiles" | "timeframeDays" | "types" | "immediate" | "paused">>;
export type NewQueueItem = Pick<QueueRow, "userId" | "kind" | "channel" | "eventId" | "orgId" | "dedupeKey" | "sendAfter">;
export type CandidateRule = { rule: RuleRow; timeZone: string | null };
export type EventSaver = { userId: string; timeZone: string | null };
export type ReminderTarget = { userId: string; eventId: string; orgId: string; startsAt: Date; timeZone: string | null };

export type NotificationsRepo = ReturnType<typeof createNotificationsRepo>;

export function createNotificationsRepo(db: Database) {
  return {
    // ---- alert rules (private to their owner)
    listRules: (userId: string): Promise<RuleRow[]> =>
      withDbErrors("alerts.listRules", () => db.select().from(alertRule).where(eq(alertRule.userId, userId)).orderBy(asc(alertRule.createdAt), asc(alertRule.id))),

    countRules: (userId: string): Promise<number> =>
      withDbErrors("alerts.countRules", async () => {
        const [row] = await db.select({ n: count() }).from(alertRule).where(eq(alertRule.userId, userId));
        return Number(row?.n ?? 0);
      }),

    insertRule: (values: NewRule): Promise<RuleRow> =>
      withDbErrors("alerts.insertRule", async () => {
        const [row] = await db.insert(alertRule).values(values).returning();
        if (!row) throw new Error("insert returned no row");
        return row;
      }),

    updateRule: (id: string, userId: string, patch: RulePatch): Promise<RuleRow | null> =>
      withDbErrors("alerts.updateRule", async () => {
        const [row] = await db.update(alertRule).set(patch).where(and(eq(alertRule.id, id), eq(alertRule.userId, userId))).returning();
        return row ?? null;
      }),

    deleteRule: (id: string, userId: string): Promise<boolean> =>
      withDbErrors("alerts.deleteRule", async () => {
        const rows = await db.delete(alertRule).where(and(eq(alertRule.id, id), eq(alertRule.userId, userId))).returning({ id: alertRule.id });
        return rows.length > 0;
      }),

    findRule: (id: string): Promise<RuleRow | null> =>
      withDbErrors("alerts.findRule", async () => {
        const [row] = await db.select().from(alertRule).where(eq(alertRule.id, id)).limit(1);
        return row ?? null;
      }),

    /**
     * Rules that could match an event near this point: not paused, not muted for the event's church,
     * and a coarse distance prefilter. The exact test is done by the matching function.
     */
    candidateRules: (lat: number, orgId: string): Promise<CandidateRule[]> =>
      withDbErrors("alerts.candidateRules", async () => {
        const rows = await db
          .select({ rule: alertRule, timeZone: userProfile.timeZone })
          .from(alertRule)
          .leftJoin(userProfile, eq(userProfile.clerkUserId, alertRule.userId))
          .where(
            and(
              eq(alertRule.paused, false),
              sql`(${alertRule.radiusMiles} is null or abs(${alertRule.lat} - ${lat}) <= ${alertRule.radiusMiles} / 69.0 + 0.01)`,
              sql`not exists (select 1 from org_mute m where m.user_id = ${alertRule.userId} and m.org_id = ${orgId}::uuid)`,
            ),
          );
        return rows;
      }),

    // ---- push tokens
    upsertToken: (userId: string, token: string, platform: string): Promise<string> =>
      withDbErrors("push.upsertToken", async () => {
        // A phone belongs to one person at a time: signing in as someone else moves it.
        const [row] = await db
          .insert(pushToken)
          .values({ userId, token, platform })
          .onConflictDoUpdate({ target: pushToken.token, set: { userId, platform } })
          .returning({ id: pushToken.id });
        if (!row) throw new Error("upsert returned no row");
        return row.id;
      }),

    listTokens: (userId: string): Promise<{ id: string; token: string }[]> =>
      withDbErrors("push.listTokens", () => db.select({ id: pushToken.id, token: pushToken.token }).from(pushToken).where(eq(pushToken.userId, userId))),

    revokeToken: (id: string, userId: string): Promise<boolean> =>
      withDbErrors("push.revokeToken", async () => {
        const rows = await db.delete(pushToken).where(and(eq(pushToken.id, id), eq(pushToken.userId, userId))).returning({ id: pushToken.id });
        return rows.length > 0;
      }),

    deleteTokenValues: (tokens: string[]): Promise<void> =>
      withDbErrors("push.deleteTokenValues", async () => {
        if (tokens.length > 0) await db.delete(pushToken).where(inArray(pushToken.token, tokens));
      }),

    // ---- settings and mutes
    getReminders: (userId: string): Promise<boolean> =>
      withDbErrors("settings.getReminders", async () => {
        const [row] = await db.select({ reminders: userProfile.reminders }).from(userProfile).where(eq(userProfile.clerkUserId, userId)).limit(1);
        return row?.reminders ?? true;
      }),

    setReminders: (userId: string, reminders: boolean): Promise<boolean> =>
      withDbErrors("settings.setReminders", async () => {
        const rows = await db.update(userProfile).set({ reminders }).where(eq(userProfile.clerkUserId, userId)).returning({ id: userProfile.id });
        return rows.length > 0;
      }),

    timeZoneOf: (userId: string): Promise<string | null> =>
      withDbErrors("settings.timeZoneOf", async () => {
        const [row] = await db.select({ tz: userProfile.timeZone }).from(userProfile).where(eq(userProfile.clerkUserId, userId)).limit(1);
        return row?.tz ?? null;
      }),

    addMute: (userId: string, orgId: string): Promise<void> =>
      withDbErrors("mute.add", async () => {
        await db.insert(orgMute).values({ userId, orgId }).onConflictDoNothing();
      }),

    removeMute: (userId: string, orgId: string): Promise<void> =>
      withDbErrors("mute.remove", async () => {
        await db.delete(orgMute).where(and(eq(orgMute.userId, userId), eq(orgMute.orgId, orgId)));
      }),

    // ---- the queue
    /** Queues messages; one that already exists for the same person and key is skipped. Returns how many were new. */
    enqueue: (items: NewQueueItem[]): Promise<number> =>
      withDbErrors("queue.enqueue", async () => {
        if (items.length === 0) return 0;
        const rows = await db.insert(notificationQueue).values(items).onConflictDoNothing({ target: [notificationQueue.userId, notificationQueue.dedupeKey] }).returning({ id: notificationQueue.id });
        return rows.length;
      }),

    due: (now: Date, limit: number): Promise<QueueRow[]> =>
      withDbErrors("queue.due", () =>
        db.select().from(notificationQueue).where(and(eq(notificationQueue.status, "pending"), lte(notificationQueue.sendAfter, now))).orderBy(asc(notificationQueue.sendAfter), asc(notificationQueue.id)).limit(limit),
      ),

    markSent: (ids: string[], now: Date): Promise<void> =>
      withDbErrors("queue.markSent", async () => {
        if (ids.length > 0) await db.update(notificationQueue).set({ status: "sent", sentAt: now }).where(inArray(notificationQueue.id, ids));
      }),

    markDropped: (ids: string[], now: Date): Promise<void> =>
      withDbErrors("queue.markDropped", async () => {
        if (ids.length > 0) await db.update(notificationQueue).set({ status: "dropped", sentAt: now }).where(inArray(notificationQueue.id, ids));
      }),

    reschedule: (id: string, sendAfter: Date, attempts: number): Promise<void> =>
      withDbErrors("queue.reschedule", async () => {
        await db.update(notificationQueue).set({ sendAfter, attempts }).where(eq(notificationQueue.id, id));
      }),

    immediateSentSince: (userId: string, since: Date): Promise<number> =>
      withDbErrors("queue.immediateSentSince", async () => {
        const [row] = await db
          .select({ n: count() })
          .from(notificationQueue)
          .where(and(eq(notificationQueue.userId, userId), eq(notificationQueue.status, "sent"), eq(notificationQueue.kind, "new_event"), eq(notificationQueue.channel, "now"), gte(notificationQueue.sentAt, since)));
        return Number(row?.n ?? 0);
      }),

    orgNewEventsSince: (userId: string, orgId: string, since: Date): Promise<number> =>
      withDbErrors("queue.orgNewEventsSince", async () => {
        const [row] = await db
          .select({ n: count() })
          .from(notificationQueue)
          .where(and(eq(notificationQueue.userId, userId), eq(notificationQueue.orgId, orgId), eq(notificationQueue.kind, "new_event"), inArray(notificationQueue.status, ["pending", "sent"]), gte(notificationQueue.createdAt, since)));
        return Number(row?.n ?? 0);
      }),

    sentSince: (since: Date): Promise<number> =>
      withDbErrors("queue.sentSince", async () => {
        const [row] = await db.select({ n: count() }).from(notificationQueue).where(and(eq(notificationQueue.status, "sent"), gte(notificationQueue.sentAt, since)));
        return Number(row?.n ?? 0);
      }),

    purgeFinished: (before: Date): Promise<number> =>
      withDbErrors("queue.purgeFinished", async () => {
        const rows = await db.delete(notificationQueue).where(and(inArray(notificationQueue.status, ["sent", "dropped"]), lt(notificationQueue.sentAt, before))).returning({ id: notificationQueue.id });
        return rows.length;
      }),

    // ---- who to tell about an event (the people who saved it)
    savers: (eventId: string): Promise<EventSaver[]> =>
      withDbErrors("queue.savers", async () => {
        const result = await db.execute(
          sql`select s.user_id as "userId", p.time_zone as "timeZone" from saved_event s left join user_profile p on p.clerk_user_id = s.user_id where s.event_id = ${eventId}::uuid`,
        );
        return result.rows as unknown as EventSaver[];
      }),

    /** Saved events starting in the window, for members who want reminders. */
    reminderTargets: (from: Date, to: Date): Promise<ReminderTarget[]> =>
      withDbErrors("queue.reminderTargets", async () => {
        const result = await db.execute(
          sql`select s.user_id as "userId", e.id as "eventId", e.org_id as "orgId", e.starts_at as "startsAt", p.time_zone as "timeZone"
              from saved_event s
              join event e on e.id = s.event_id
              left join user_profile p on p.clerk_user_id = s.user_id
              where e.status = 'published' and e.moderation_state = 'published'
                and e.starts_at > ${from.toISOString()}::timestamptz and e.starts_at <= ${to.toISOString()}::timestamptz
                and coalesce(p.reminders, true)`,
        );
        return (result.rows as unknown as (Omit<ReminderTarget, "startsAt"> & { startsAt: string | Date })[]).map((r) => ({ ...r, startsAt: new Date(r.startsAt) }));
      }),
  };
}
