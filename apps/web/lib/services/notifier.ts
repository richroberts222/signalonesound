import type { EventsRepo, PublicRow } from "../../db/events";
import type { NewQueueItem, NotificationsRepo, QueueRow } from "../../db/notifications";
import { matchesRule } from "../notifications/matching";
import { DEFAULT_TIME_ZONE, inQuietHours, nextLocalHour, planDelivery, QUIET_END_HOUR, sendTimeAfterQuietHours, startOfLocalDay } from "../notifications/policy";
import type { PushMessage, PushPort } from "../notifications/push";

// The notifier (S7, docs/features/s7-alerts-and-push.md): queues messages when an event is published or
// changes and when a reminder is due, and delivers what is due while obeying the notification policy
// (quiet hours, daily and weekly caps) and a monthly ceiling on how much is sent. A message holds only a
// title and a place. Queuing is idempotent, so a repeated job run never makes a second message, and a
// provider failure retries with backoff and then drops with a log, never silently.
// Framework-free; repos, the push port and the clock are injected.
export type NotifierDeps = {
  repo: NotificationsRepo;
  events: Pick<EventsRepo, "getPublic" | "getManyWithOrg">;
  push: PushPort;
  /** Called with a short name (never personal data) when something needs a person's attention. */
  onProblem?: (name: string) => void;
  /** The most messages sent in a calendar month before sending stops (cost guard). */
  monthlyCeiling?: number;
  now?: () => Date;
};

export const DEFAULT_MONTHLY_CEILING = 9000;
export const MAX_ATTEMPTS = 5;
const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;
const BATCH = 500;

const place = (e: Pick<PublicRow, "city" | "state">) => `${e.city}, ${e.state}`;

export function createNotifier({ repo, events, push, onProblem = () => {}, monthlyCeiling = DEFAULT_MONTHLY_CEILING, now = () => new Date() }: NotifierDeps) {
  return {
    /** An event was published: queue one message for every member with a matching alert. */
    async enqueueNewEvent(eventId: string): Promise<{ queued: number; dropped: number }> {
      const event = await events.getPublic(eventId);
      if (!event || event.status !== "published" || event.lat === null || event.lng === null) return { queued: 0, dropped: 0 };
      const at = now();
      const people = new Map<string, { immediate: boolean; timeZone: string }>();
      for (const { rule, timeZone } of await repo.candidateRules(event.lat, event.orgId)) {
        const types = rule.types ? rule.types.split(",") : [];
        if (!matchesRule({ lat: rule.lat, lng: rule.lng, radiusMiles: rule.radiusMiles, timeframeDays: rule.timeframeDays, types }, event, at)) continue;
        const person = people.get(rule.userId) ?? { immediate: false, timeZone: timeZone ?? DEFAULT_TIME_ZONE };
        person.immediate ||= rule.immediate; // however many rules match, it is one message
        people.set(rule.userId, person);
      }
      const items: NewQueueItem[] = [];
      let dropped = 0;
      for (const [userId, person] of people) {
        const plan = planDelivery({
          kind: "new_event",
          immediate: person.immediate,
          now: at,
          timeZone: person.timeZone,
          immediateSentToday: await repo.immediateSentSince(userId, startOfLocalDay(at, person.timeZone)),
          orgSentThisWeek: await repo.orgNewEventsSince(userId, event.orgId, new Date(at.getTime() - 7 * DAY_MS)),
        });
        if (plan.action === "drop") {
          dropped += 1;
          continue;
        }
        items.push({ userId, kind: "new_event", channel: plan.channel, eventId, orgId: event.orgId, dedupeKey: `new:${eventId}`, sendAfter: plan.at });
      }
      return { queued: await repo.enqueue(items), dropped };
    },

    /** An event changed (time, place, cancelled, hidden or deleted): tell the members who saved it, at most once an hour. */
    async enqueueEventChange(eventId: string): Promise<{ queued: number }> {
      const [event] = await events.getManyWithOrg([eventId]);
      if (!event) return { queued: 0 };
      const at = now();
      const bucket = Math.floor(at.getTime() / HOUR_MS);
      const items: NewQueueItem[] = (await repo.savers(eventId)).map((s) => ({
        userId: s.userId,
        kind: "event_changed",
        channel: "now",
        eventId,
        orgId: event.orgId,
        dedupeKey: `chg:${eventId}:${bucket}`,
        sendAfter: sendTimeAfterQuietHours(at, s.timeZone ?? DEFAULT_TIME_ZONE),
      }));
      return { queued: await repo.enqueue(items) };
    },

    /** Reminders for saved events starting in about a day and in about two hours. */
    async enqueueReminders(): Promise<{ queued: number }> {
      const at = now();
      const windows = [
        { key: "rem24", from: new Date(at.getTime() + 23 * HOUR_MS), to: new Date(at.getTime() + 25 * HOUR_MS) },
        { key: "rem2", from: new Date(at.getTime() + HOUR_MS), to: new Date(at.getTime() + 3 * HOUR_MS) },
      ];
      const items: NewQueueItem[] = [];
      for (const w of windows) {
        for (const t of await repo.reminderTargets(w.from, w.to)) {
          items.push({
            userId: t.userId,
            kind: "reminder",
            channel: "now",
            eventId: t.eventId,
            orgId: t.orgId,
            dedupeKey: `${w.key}:${t.eventId}`,
            sendAfter: sendTimeAfterQuietHours(at, t.timeZone ?? DEFAULT_TIME_ZONE),
          });
        }
      }
      return { queued: await repo.enqueue(items) };
    },

    /** Sends what is due. Safe to run again: a sent message is never sent twice. */
    async deliverDue(): Promise<{ sent: number; dropped: number; retried: number; ceilingReached: boolean }> {
      const at = now();
      const monthStart = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
      let sentThisMonth = await repo.sentSince(monthStart);
      const result = { sent: 0, dropped: 0, retried: 0, ceilingReached: false };
      if (sentThisMonth >= monthlyCeiling) {
        onProblem("send_ceiling_reached");
        return { ...result, ceilingReached: true };
      }

      const due = await repo.due(at, BATCH);
      const byUser = new Map<string, QueueRow[]>();
      for (const row of due) byUser.set(row.userId, [...(byUser.get(row.userId) ?? []), row]);
      const details = new Map((await events.getManyWithOrg([...new Set(due.map((r) => r.eventId))])).map((e) => [e.id, e]));

      for (const [userId, rows] of byUser) {
        const timeZone = (await repo.timeZoneOf(userId)) ?? DEFAULT_TIME_ZONE;
        if (inQuietHours(at, timeZone)) {
          // The job ran at night for this member: wait for morning without counting an attempt.
          const morning = nextLocalHour(at, timeZone, QUIET_END_HOUR);
          for (const row of rows) await repo.reschedule(row.id, morning, row.attempts);
          continue;
        }
        const tokens = await repo.listTokens(userId);
        if (tokens.length === 0) {
          await repo.markDropped(rows.map((r) => r.id), at); // no phone to tell
          result.dropped += rows.length;
          continue;
        }

        // One message per item, except new events in the digest, which are one summary.
        const digest = rows.filter((r) => r.kind === "new_event" && r.channel === "digest");
        const singles = rows.filter((r) => !digest.includes(r));
        const units: { rows: QueueRow[]; message: Omit<PushMessage, "to"> }[] = [];
        for (const row of singles) {
          const e = details.get(row.eventId);
          if (!e) {
            await repo.markDropped([row.id], at);
            result.dropped += 1;
            continue;
          }
          const lead = row.kind === "reminder" ? "Reminder: " : row.kind === "event_changed" ? "Update: " : "";
          units.push({ rows: [row], message: { title: `${lead}${e.title}`, body: place(e), data: { eventId: row.eventId } } });
        }
        if (digest.length > 0) {
          units.push({ rows: digest, message: { title: "New events near you", body: `${digest.length} new ${digest.length === 1 ? "event" : "events"}`, data: {} } });
        }

        for (const unit of units) {
          if (sentThisMonth + 1 > monthlyCeiling) {
            onProblem("send_ceiling_reached");
            return { ...result, ceilingReached: true };
          }
          const sent = await push.send(tokens.map((t) => ({ to: t.token, ...unit.message })));
          const invalid = sent.filter((r) => r.status === "invalid").map((r) => r.to);
          if (invalid.length > 0) await repo.deleteTokenValues(invalid); // a phone the service no longer knows
          const delivered = sent.some((r) => r.status === "ok");
          const ids = unit.rows.map((r) => r.id);
          if (delivered) {
            await repo.markSent(ids, at);
            sentThisMonth += 1;
            result.sent += 1;
          } else if (sent.every((r) => r.status === "invalid")) {
            await repo.markDropped(ids, at);
            result.dropped += unit.rows.length;
          } else {
            for (const row of unit.rows) {
              const attempts = row.attempts + 1;
              if (attempts >= MAX_ATTEMPTS) {
                await repo.markDropped([row.id], at);
                onProblem("message_dropped_after_retries");
                result.dropped += 1;
              } else {
                await repo.reschedule(row.id, new Date(at.getTime() + 2 ** attempts * 60_000), attempts); // back off: 2, 4, 8, 16 minutes
                result.retried += 1;
              }
            }
          }
        }
      }
      return result;
    },

    /** Removes finished queue rows 30 days after they were sent or dropped. */
    async purge(): Promise<{ removed: number }> {
      return { removed: await repo.purgeFinished(new Date(now().getTime() - 30 * DAY_MS)) };
    },
  };
}

export type Notifier = ReturnType<typeof createNotifier>;
