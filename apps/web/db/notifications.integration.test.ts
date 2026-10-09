import { assertDestructiveAllowed, parseDatabaseEnv } from "@signalone/shared";
import { eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { createEventsRepo, type NewEvent } from "./events";
import { createMemberRepo } from "./member";
import { createNotificationsRepo } from "./notifications";
import { createSavedRepo } from "./saved";
import { alertRule, auditLog, event, eventLink, eventRevivalType, idempotencyRecord, notificationQueue, orgMute, organization, pushToken, savedEvent, userProfile } from "./schema";

// Database-backed integration tests for alerts, push tokens and the notification queue (S7,
// /docs/automation/integration.md). They run ONLY via `pnpm --filter web test:integration`, never in
// `pnpm test`, and are fail-closed: DATABASE_ENV must be explicitly `dev` or `qa`; STAGE and PROD are
// refused. The migrations must already be applied (`pnpm --filter web db:migrate -- --env=dev`).
const config = parseDatabaseEnv(process.env);
assertDestructiveAllowed(config.databaseEnv, ["dev", "qa"], "test:integration");
if (process.env.APP_ENV && process.env.APP_ENV !== config.databaseEnv) {
  throw new Error("test:integration: APP_ENV must equal DATABASE_ENV; refusing.");
}
if (process.env.VERCEL_ENV) throw new Error("test:integration: must not run on Vercel; refusing.");

const db = createDb(config.databaseUrl);
const repo = createNotificationsRepo(db);
const events = createEventsRepo(db);
const saved = createSavedRepo(db);
const members = createMemberRepo(db);
const PREFIX = "itest-s7-";
const orgId = crypto.randomUUID();
const users = new Set<string>();
const now = new Date();
const hours = (n: number) => new Date(now.getTime() + n * 3600 * 1000);
const newUser = async (withProfile = true) => {
  const id = `user_${PREFIX}${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  users.add(id);
  if (withProfile) await db.insert(userProfile).values({ clerkUserId: id, timeZone: "America/Chicago" });
  return id;
};
const rule = (userId: string, over: Partial<typeof alertRule.$inferInsert> = {}) => ({
  userId, placeLabel: "Nashville, TN", lat: 36.16, lng: -86.78, radiusMiles: 25, timeframeDays: 14, types: "", immediate: false, paused: false, ...over,
});
const make = (over: Partial<NewEvent> = {}): NewEvent => ({
  id: crypto.randomUUID(), orgId, seriesId: null, title: `${PREFIX}event`, description: "", status: "published", startsAt: hours(48), endsAt: null, timeZone: "America/Chicago",
  venueName: "Hall", street: "1 St", city: "Nashville", state: "TN", zip: "37201", lat: 36.2, lng: -86.78, speakers: null, directions: null, revivalTypes: ["worship-nights"], links: [], ...over,
});
const insertEvent = (e: NewEvent) => events.createMany({ series: null, events: [e], userId: `user_${PREFIX}maker`, idempotencyKey: crypto.randomUUID(), audit: { actorId: `user_${PREFIX}maker`, action: "event.create", subject: `${PREFIX}${e.id}` } });
const item = (userId: string, eventId: string, over: Partial<Parameters<typeof repo.enqueue>[0][number]> = {}) => ({
  userId, kind: "new_event", channel: "digest", eventId, orgId, dedupeKey: `new:${eventId}`, sendAfter: hours(-1), ...over,
});

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: `${PREFIX}org`, nameKey: `${PREFIX}org-${orgId}`, status: "approved" });
});

afterAll(async () => {
  const ids = [...users];
  const eventIds = (await db.select({ id: event.id }).from(event).where(eq(event.orgId, orgId))).map((r) => r.id);
  if (ids.length > 0) {
    await db.delete(alertRule).where(inArray(alertRule.userId, ids));
    await db.delete(pushToken).where(inArray(pushToken.userId, ids));
    await db.delete(notificationQueue).where(inArray(notificationQueue.userId, ids));
    await db.delete(orgMute).where(inArray(orgMute.userId, ids));
    await db.delete(savedEvent).where(inArray(savedEvent.userId, ids));
    await db.delete(userProfile).where(inArray(userProfile.clerkUserId, ids));
  }
  if (eventIds.length > 0) {
    await db.delete(eventRevivalType).where(inArray(eventRevivalType.eventId, eventIds));
    await db.delete(eventLink).where(inArray(eventLink.eventId, eventIds));
    await db.delete(idempotencyRecord).where(inArray(idempotencyRecord.eventId, eventIds));
  }
  await db.delete(event).where(eq(event.orgId, orgId));
  await db.delete(organization).where(eq(organization.id, orgId));
  await db.delete(auditLog).where(like(auditLog.subject, `%${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `%${PREFIX}%`));
});

describe("alert rules against the real database", () => {
  it("are private to their owner and removed by id only for that owner", async () => {
    const alice = await newUser();
    const bob = await newUser();
    const created = await repo.insertRule(rule(alice, { types: "baptisms" }));
    expect((await repo.listRules(alice)).map((r) => r.id)).toEqual([created.id]);
    expect(await repo.listRules(bob)).toEqual([]);
    expect(await repo.countRules(alice)).toBe(1);
    expect(await repo.updateRule(created.id, bob, { paused: true })).toBeNull();
    expect((await repo.updateRule(created.id, alice, { paused: true }))?.paused).toBe(true);
    expect(await repo.deleteRule(created.id, bob)).toBe(false);
    expect(await repo.deleteRule(created.id, alice)).toBe(true);
  });

  it("candidates leave out paused alerts, muted churches and alerts too far away to matter", async () => {
    const near = await newUser();
    const paused = await newUser();
    const muted = await newUser();
    const far = await newUser();
    const anywhere = await newUser();
    await repo.insertRule(rule(near));
    await repo.insertRule(rule(paused, { paused: true }));
    await repo.insertRule(rule(muted));
    await repo.addMute(muted, orgId);
    await repo.insertRule(rule(far, { lat: 45.0, radiusMiles: 10 }));
    await repo.insertRule(rule(anywhere, { lat: 45.0, radiusMiles: null }));
    const found = (await repo.candidateRules(36.2, orgId)).map((c) => c.rule.userId);
    expect(found).toEqual(expect.arrayContaining([near, anywhere]));
    for (const excluded of [paused, muted, far]) expect(found).not.toContain(excluded);
    expect((await repo.candidateRules(36.2, orgId)).find((c) => c.rule.userId === near)?.timeZone).toBe("America/Chicago");
  });
});

describe("push tokens against the real database", () => {
  it("a phone belongs to one person at a time, and only its owner can remove it", async () => {
    const alice = await newUser();
    const bob = await newUser();
    const token = `ExponentPushToken[${PREFIX}${crypto.randomUUID()}]`;
    const first = await repo.upsertToken(alice, token, "ios");
    expect(await repo.upsertToken(alice, token, "ios")).toBe(first);
    expect((await repo.listTokens(alice)).map((t) => t.token)).toEqual([token]);
    await repo.upsertToken(bob, token, "android"); // the phone is signed in as bob now
    expect(await repo.listTokens(alice)).toEqual([]);
    expect((await repo.listTokens(bob)).map((t) => t.token)).toEqual([token]);
    expect(await repo.revokeToken(first, alice)).toBe(false);
    await repo.deleteTokenValues([token]);
    expect(await repo.listTokens(bob)).toEqual([]);
  });
});

describe("the notification queue against the real database", () => {
  it("queues once per person and key, hands out only what is due, and counts sent messages for the caps", async () => {
    const user = await newUser();
    const e = make();
    await insertEvent(e);
    expect(await repo.enqueue([item(user, e.id)])).toBe(1);
    expect(await repo.enqueue([item(user, e.id)])).toBe(0); // the same key again: nothing new
    const later = make();
    await insertEvent(later);
    await repo.enqueue([item(user, later.id, { sendAfter: hours(5) })]);
    const due = (await repo.due(now, 100)).filter((d) => d.userId === user);
    expect(due.map((d) => d.eventId)).toEqual([e.id]); // the later one is not due yet
    expect(await repo.orgNewEventsSince(user, orgId, hours(-24 * 7))).toBe(2);
    await repo.markSent(due.map((d) => d.id), now);
    expect(await repo.due(now, 100).then((r) => r.filter((d) => d.userId === user))).toEqual([]);
    expect(await repo.sentSince(hours(-1))).toBeGreaterThanOrEqual(1);
    expect(await repo.immediateSentSince(user, hours(-24))).toBe(0); // it was a digest, not an immediate alert
    const immediate = make();
    await insertEvent(immediate);
    await repo.enqueue([item(user, immediate.id, { channel: "now" })]);
    const row = (await repo.due(now, 100)).find((d) => d.eventId === immediate.id)!;
    await repo.markSent([row.id], now);
    expect(await repo.immediateSentSince(user, hours(-24))).toBe(1);
  });

  it("reschedule moves a message later; dropped and old finished rows are purged after the cutoff only", async () => {
    const user = await newUser();
    const e = make();
    await insertEvent(e);
    await repo.enqueue([item(user, e.id)]);
    const row = (await repo.due(now, 100)).find((d) => d.userId === user)!;
    await repo.reschedule(row.id, hours(3), 2);
    expect((await repo.due(now, 100)).filter((d) => d.userId === user)).toEqual([]);
    await repo.markDropped([row.id], hours(-24 * 40));
    expect(await repo.purgeFinished(hours(-24 * 30))).toBeGreaterThanOrEqual(1);
    expect(await db.select().from(notificationQueue).where(eq(notificationQueue.id, row.id))).toEqual([]);
  });

  it("finds the people who saved an event, and saved events starting in a window for members who want reminders", async () => {
    const wants = await newUser();
    const off = await newUser();
    const e = make({ startsAt: hours(24) });
    await insertEvent(e);
    await saved.save(wants, e.id);
    await saved.save(off, e.id);
    await repo.setReminders(off, false);
    expect((await repo.savers(e.id)).map((s) => s.userId).sort()).toEqual([off, wants].sort());
    const targets = (await repo.reminderTargets(hours(23), hours(25))).filter((t) => t.eventId === e.id);
    expect(targets.map((t) => t.userId)).toEqual([wants]);
    expect(await repo.reminderTargets(hours(1), hours(3)).then((r) => r.filter((t) => t.eventId === e.id))).toEqual([]);
    expect(await repo.getReminders(wants)).toBe(true);
    expect(await repo.getReminders(off)).toBe(false);
  });
});

describe("account deletion removes alerts, phones and queued messages", () => {
  it("export holds the person's own rows (a phone only by kind), and erase removes them", async () => {
    const alice = await newUser();
    const bob = await newUser();
    const e = make();
    await insertEvent(e);
    await repo.insertRule(rule(alice));
    await repo.insertRule(rule(bob));
    const token = `ExponentPushToken[${PREFIX}${crypto.randomUUID()}]`;
    await repo.upsertToken(alice, token, "ios");
    await repo.addMute(alice, orgId);
    await repo.enqueue([item(alice, e.id)]);
    const exported = await members.exportAll(alice);
    expect(exported.alert_rule).toHaveLength(1);
    expect(exported.org_mute).toHaveLength(1);
    expect(exported.notification_queue).toHaveLength(1);
    expect(JSON.stringify(exported.push_token)).not.toContain(token); // the push address is a credential: not exported
    expect(exported.push_token).toHaveLength(1);
    await members.eraseAll(alice);
    expect(await repo.listRules(alice)).toEqual([]);
    expect(await repo.listTokens(alice)).toEqual([]);
    expect((await db.select().from(notificationQueue).where(eq(notificationQueue.userId, alice))).length).toBe(0);
    expect((await db.select().from(orgMute).where(eq(orgMute.userId, alice))).length).toBe(0);
    expect((await repo.listRules(bob)).length).toBe(1); // another person's alert is untouched
  });
});
