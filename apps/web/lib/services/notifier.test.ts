import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import type { NewEvent } from "../../db/events";
import { createFakeEventsRepo } from "../../db/events.fake";
import { createFakeNotificationsRepo, emptyNotificationWorld, type NotificationWorld } from "../../db/notifications.fake";
import type { PushMessage, PushResult } from "../notifications/push";
import { MAX_ATTEMPTS, createNotifier } from "./notifier";

// S7 acceptance criteria that need the clock and the queue, at the service boundary (the fake clock moves
// time): AC2 one message per member per event, AC3 changes coalesced per hour, AC4 quiet hours and caps,
// AC8 invalid devices removed, AC10 idempotent and retried with backoff, AC11 the monthly ceiling.
const MILE = 69.0934;
const DAY = 24 * 3600 * 1000;
const origin = { lat: 36.16, lng: -86.78 };
const org = randomUUID();

const setup = (opts: { ceiling?: number } = {}) => {
  let clock = new Date("2026-10-14T17:00:00Z"); // noon in Chicago (UTC-5)
  const now = () => clock;
  const world: NotificationWorld = emptyNotificationWorld();
  const events = createFakeEventsRepo(now);
  const repo = createFakeNotificationsRepo(world, now);
  const sent: PushMessage[] = [];
  const respond = { next: (m: PushMessage[]): PushResult[] => m.map((x) => ({ to: x.to, status: "ok" })) };
  const push = { send: vi.fn(async (m: PushMessage[]) => (sent.push(...m), respond.next(m))) };
  const problems: string[] = [];
  const notifier = createNotifier({ repo, events, push, onProblem: (n) => problems.push(n), monthlyCeiling: opts.ceiling, now });

  let n = 0;
  const addEvent = async (over: Partial<NewEvent> & { milesNorth?: number } = {}) => {
    const { milesNorth = 5, ...rest } = over;
    const e: NewEvent = {
      id: randomUUID(), orgId: org, seriesId: null, title: `Event ${++n}`, description: "", status: "published",
      startsAt: new Date(clock.getTime() + 3 * DAY), endsAt: null, timeZone: "America/Chicago", venueName: `Venue ${n}`,
      street: "1 St", city: "Nashville", state: "TN", zip: "37201", lat: origin.lat + milesNorth / MILE, lng: origin.lng,
      speakers: null, directions: null, revivalTypes: ["worship-nights"], links: [], ...rest,
    };
    await events.createMany({ series: null, events: [e], userId: "u", idempotencyKey: randomUUID(), audit: { actorId: "u", action: "x", subject: "x" } });
    return e;
  };
  const addUser = async (id: string, over: { immediate?: boolean; radius?: number | null; types?: string; timeZone?: string; token?: boolean } = {}) => {
    await repo.insertRule({ userId: id, placeLabel: "Nashville, TN", lat: origin.lat, lng: origin.lng, radiusMiles: over.radius === undefined ? 25 : over.radius, timeframeDays: 30, types: over.types ?? "", immediate: over.immediate ?? false, paused: false });
    if (over.timeZone) world.timeZones.set(id, over.timeZone);
    if (over.token !== false) await repo.upsertToken(id, `ExponentPushToken[${id}]`, "ios");
  };
  return { notifier, repo, events, world, push, sent, respond, problems, addEvent, addUser, advance: (ms: number) => (clock = new Date(clock.getTime() + ms)), set: (d: Date) => (clock = d) };
};

describe("new events", () => {
  it("AC2 one message per member per event, however many alerts match, and a repeated run adds nothing", async () => {
    const s = setup();
    await s.addUser("user_a");
    await s.repo.insertRule({ userId: "user_a", placeLabel: "Nashville, TN", lat: origin.lat, lng: origin.lng, radiusMiles: null, timeframeDays: 14, types: "worship-nights", immediate: false, paused: false });
    await s.addUser("user_b");
    const e = await s.addEvent();
    expect(await s.notifier.enqueueNewEvent(e.id)).toEqual({ queued: 2, dropped: 0 });
    expect(await s.notifier.enqueueNewEvent(e.id)).toEqual({ queued: 0, dropped: 0 }); // idempotent
    expect(s.repo.queue().map((q) => q.userId).sort()).toEqual(["user_a", "user_b"]);
  });

  it("only matching, unmuted, unpaused alerts queue a message", async () => {
    const s = setup();
    await s.addUser("user_far", { radius: 5 });
    await s.addUser("user_type", { types: "baptisms" });
    await s.addUser("user_muted");
    await s.repo.addMute("user_muted", org);
    await s.addUser("user_paused");
    await s.repo.updateRule((await s.repo.listRules("user_paused"))[0].id, "user_paused", { paused: true });
    await s.addUser("user_yes");
    const e = await s.addEvent({ milesNorth: 12 });
    expect((await s.notifier.enqueueNewEvent(e.id)).queued).toBe(1);
    expect(s.repo.queue()[0].userId).toBe("user_yes");
  });

  it("an event that is not public, not published, or has no position queues nothing", async () => {
    const s = setup();
    await s.addUser("user_a");
    const draft = await s.addEvent({ status: "draft" });
    const unlocated = await s.addEvent({ lat: null, lng: null });
    const cancelled = await s.addEvent();
    await s.events.setStatus({ id: cancelled.id, from: ["published"], to: "cancelled", audit: { actorId: "u", action: "x", subject: "x" } });
    for (const e of [draft, unlocated, cancelled, { id: randomUUID() }]) expect((await s.notifier.enqueueNewEvent(e.id)).queued, e.id).toBe(0);
  });

  it("AC4 a member gets the daily digest at 9 am their time; an immediate member gets one alert now and the rest in the digest", async () => {
    const s = setup();
    await s.addUser("user_digest");
    await s.addUser("user_now", { immediate: true });
    const first = await s.addEvent();
    await s.notifier.enqueueNewEvent(first.id);
    const queue = Object.fromEntries(s.repo.queue().map((q) => [q.userId, q]));
    expect(queue.user_digest).toMatchObject({ channel: "digest", sendAfter: new Date("2026-10-15T14:00:00Z") }); // 9 AM Chicago
    expect(queue.user_now).toMatchObject({ channel: "now", sendAfter: new Date("2026-10-14T17:00:00Z") });
    await s.notifier.deliverDue();
    const second = await s.addEvent();
    await s.notifier.enqueueNewEvent(second.id);
    expect(s.repo.queue().find((q) => q.userId === "user_now" && q.eventId === second.id)).toMatchObject({ channel: "digest" }); // the daily immediate cap is used
  });

  it("AC4 an immediate alert queued at night waits for 8 am", async () => {
    const s = setup();
    await s.addUser("user_now", { immediate: true });
    s.set(new Date("2026-10-15T05:30:00Z")); // 12:30 AM in Chicago
    const e = await s.addEvent();
    await s.notifier.enqueueNewEvent(e.id);
    expect(s.repo.queue()[0].sendAfter).toEqual(new Date("2026-10-15T13:00:00Z"));
  });

  it("AC4 at most three alerts per church per member per week; the fourth is dropped, and it counts again after a week", async () => {
    const s = setup();
    await s.addUser("user_a");
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await s.notifier.enqueueNewEvent((await s.addEvent()).id));
    expect(results.map((r) => [r.queued, r.dropped])).toEqual([[1, 0], [1, 0], [1, 0], [0, 1]]);
    s.advance(8 * DAY);
    expect((await s.notifier.enqueueNewEvent((await s.addEvent()).id)).queued).toBe(1);
  });
});

describe("changes and reminders", () => {
  it("AC3 members who saved an event hear about a change, at most once an hour", async () => {
    const s = setup();
    const e = await s.addEvent();
    s.world.savers = () => [{ userId: "user_a", timeZone: null }, { userId: "user_b", timeZone: null }];
    expect((await s.notifier.enqueueEventChange(e.id)).queued).toBe(2);
    expect((await s.notifier.enqueueEventChange(e.id)).queued).toBe(0); // the same hour
    s.advance(20 * 60 * 1000);
    expect((await s.notifier.enqueueEventChange(e.id)).queued).toBe(0);
    s.advance(60 * 60 * 1000);
    expect((await s.notifier.enqueueEventChange(e.id)).queued).toBe(2); // a later hour
    expect(s.repo.queue().every((q) => q.kind === "event_changed")).toBe(true);
  });

  it("a change to a hidden or deleted event still reaches the people who saved it", async () => {
    const s = setup();
    const e = await s.addEvent();
    await s.events.setStatus({ id: e.id, from: ["published"], to: "deleted", audit: { actorId: "u", action: "x", subject: "x" } });
    s.world.savers = () => [{ userId: "user_a", timeZone: null }];
    expect((await s.notifier.enqueueEventChange(e.id)).queued).toBe(1);
  });

  it("reminders: a day before and two hours before, once each, and not for members who turned them off", async () => {
    const s = setup();
    const e = await s.addEvent();
    const starts = new Date(s.set(new Date("2026-10-14T17:00:00Z")).getTime() + 24 * 3600 * 1000);
    s.world.reminders = (from, to) => [{ userId: "user_a", eventId: e.id, orgId: org, startsAt: starts, timeZone: null }, { userId: "user_off", eventId: e.id, orgId: org, startsAt: starts, timeZone: null }].filter(() => starts > from && starts <= to);
    s.world.reminderOff.add("user_off");
    expect((await s.notifier.enqueueReminders()).queued).toBe(1);
    expect((await s.notifier.enqueueReminders()).queued).toBe(0);
    expect(s.repo.queue()[0]).toMatchObject({ userId: "user_a", kind: "reminder", dedupeKey: `rem24:${e.id}` });
    s.advance(22 * 3600 * 1000 + 30 * 60 * 1000); // now about an hour and a half before the start
    expect((await s.notifier.enqueueReminders()).queued).toBe(1);
    expect(s.repo.queue().map((q) => q.dedupeKey).sort()).toEqual([`rem24:${e.id}`, `rem2:${e.id}`].sort());
  });
});

describe("delivery", () => {
  it("sends the title and place only, to every phone, and marks it sent; a second run sends nothing more (AC10)", async () => {
    const s = setup();
    await s.addUser("user_now", { immediate: true });
    await s.repo.upsertToken("user_now", "ExponentPushToken[second]", "android");
    const e = await s.addEvent({ title: "Revival Night" });
    await s.notifier.enqueueNewEvent(e.id);
    expect(await s.notifier.deliverDue()).toMatchObject({ sent: 1 });
    expect(s.sent).toHaveLength(2);
    expect(s.sent[0]).toEqual({ to: "ExponentPushToken[user_now]", title: "Revival Night", body: "Nashville, TN", data: { eventId: e.id } });
    expect(JSON.stringify(s.sent.map(({ to: _to, ...content }) => content))).not.toMatch(/user_now|description|street|1 St/); // the content names no person and no street
    expect(await s.notifier.deliverDue()).toMatchObject({ sent: 0 });
    expect(s.sent).toHaveLength(2);
  });

  it("the digest is one summary message, sent at 9 am and not before", async () => {
    const s = setup();
    await s.addUser("user_a");
    for (let i = 0; i < 3; i++) await s.notifier.enqueueNewEvent((await s.addEvent()).id);
    expect(await s.notifier.deliverDue()).toMatchObject({ sent: 0 }); // noon: the digest is for tomorrow morning
    s.set(new Date("2026-10-15T14:05:00Z"));
    expect(await s.notifier.deliverDue()).toMatchObject({ sent: 1 });
    expect(s.sent).toEqual([{ to: "ExponentPushToken[user_a]", title: "New events near you", body: "3 new events", data: {} }]);
    expect(s.repo.queue().every((q) => q.status === "sent")).toBe(true);
  });

  it("AC4 if the job runs during a member's quiet hours the message waits for 8 am, without counting a failed attempt", async () => {
    const s = setup();
    await s.addUser("user_now", { immediate: true });
    const e = await s.addEvent();
    await s.notifier.enqueueNewEvent(e.id);
    s.set(new Date("2026-10-15T03:00:00Z")); // 10 PM in Chicago
    expect(await s.notifier.deliverDue()).toMatchObject({ sent: 0 });
    expect(s.repo.queue()[0]).toMatchObject({ status: "pending", attempts: 0, sendAfter: new Date("2026-10-15T13:00:00Z") });
    s.set(new Date("2026-10-15T13:01:00Z"));
    expect(await s.notifier.deliverDue()).toMatchObject({ sent: 1 });
  });

  it("AC8 a phone the push service no longer knows is removed, and a member with no phone is not messaged", async () => {
    const s = setup();
    await s.addUser("user_now", { immediate: true });
    await s.addUser("user_nophone", { immediate: true, token: false });
    s.respond.next = (m) => m.map((x) => ({ to: x.to, status: "invalid" as const }));
    const e = await s.addEvent();
    await s.notifier.enqueueNewEvent(e.id);
    const out = await s.notifier.deliverDue();
    expect(out.dropped).toBe(2);
    expect(s.repo.tokens()).toEqual([]);
    expect(s.repo.queue().every((q) => q.status === "dropped")).toBe(true);
  });

  it("AC10 a provider failure retries with backoff, then drops with a note, and never loses it silently", async () => {
    const s = setup();
    await s.addUser("user_now", { immediate: true });
    s.respond.next = (m) => m.map((x) => ({ to: x.to, status: "error" as const }));
    await s.notifier.enqueueNewEvent((await s.addEvent()).id);
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      s.set(new Date(Math.max(s.repo.queue()[0].sendAfter.getTime(), new Date("2026-10-14T17:00:00Z").getTime())));
      const r = await s.notifier.deliverDue();
      const row = s.repo.queue()[0];
      if (attempt < MAX_ATTEMPTS) {
        expect(r.retried, `attempt ${attempt}`).toBe(1);
        expect(row).toMatchObject({ status: "pending", attempts: attempt });
      } else {
        expect(r.dropped).toBe(1);
        expect(row.status).toBe("dropped");
      }
    }
    expect(s.problems).toContain("message_dropped_after_retries");
  });

  it("AC10 a retry waits longer each time (2, 4, 8 minutes)", async () => {
    const s = setup();
    await s.addUser("user_now", { immediate: true });
    s.respond.next = (m) => m.map((x) => ({ to: x.to, status: "error" as const }));
    await s.notifier.enqueueNewEvent((await s.addEvent()).id);
    const gaps: number[] = [];
    for (let i = 0; i < 3; i++) {
      const at = new Date(Math.max(s.repo.queue()[0].sendAfter.getTime(), new Date("2026-10-14T17:00:00Z").getTime()));
      s.set(at);
      await s.notifier.deliverDue();
      gaps.push((s.repo.queue()[0].sendAfter.getTime() - at.getTime()) / 60000);
    }
    expect(gaps).toEqual([2, 4, 8]);
  });

  it("AC11 the monthly ceiling stops sending and raises a problem before the free tier is exceeded", async () => {
    const s = setup({ ceiling: 2 });
    for (const id of ["user_a", "user_b", "user_c"]) await s.addUser(id, { immediate: true });
    await s.notifier.enqueueNewEvent((await s.addEvent()).id);
    const out = await s.notifier.deliverDue();
    expect(out).toMatchObject({ sent: 2, ceilingReached: true });
    expect(s.sent).toHaveLength(2);
    expect(s.problems).toContain("send_ceiling_reached");
    expect(s.repo.queue().filter((q) => q.status === "pending")).toHaveLength(1); // waits, not lost
    expect(await s.notifier.deliverDue()).toMatchObject({ sent: 0, ceilingReached: true });
    s.set(new Date("2026-11-02T18:00:00Z")); // next month
    expect(await s.notifier.deliverDue()).toMatchObject({ sent: 1, ceilingReached: false });
  });

  it("the retention job removes finished rows after 30 days and keeps pending ones", async () => {
    const s = setup();
    await s.addUser("user_now", { immediate: true });
    await s.notifier.enqueueNewEvent((await s.addEvent()).id);
    await s.notifier.deliverDue();
    expect((await s.notifier.purge()).removed).toBe(0);
    s.advance(31 * DAY);
    expect((await s.notifier.purge()).removed).toBe(1);
    expect(s.repo.queue()).toEqual([]);
  });
});
