import { assertDestructiveAllowed, parseDatabaseEnv } from "@signalone/shared";
import { eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { createEventsRepo, type NewEvent } from "./events";
import { createModerationRepo } from "./moderation";
import { auditLog, event, eventLink, eventRevivalType, idempotencyRecord, organization, organizationMember, report, reportRateLimit, userProfile } from "./schema";

// Database-backed integration tests for reports and admin moderation (S8, /docs/automation/integration.md).
// They run ONLY via `pnpm --filter web test:integration`, never in `pnpm test`, and are fail-closed:
// DATABASE_ENV must be explicitly `dev` or `qa`; STAGE and PROD are refused. The migrations must
// already be applied (`pnpm --filter web db:migrate -- --env=dev`).
const config = parseDatabaseEnv(process.env);
assertDestructiveAllowed(config.databaseEnv, ["dev", "qa"], "test:integration");
if (process.env.APP_ENV && process.env.APP_ENV !== config.databaseEnv) {
  throw new Error("test:integration: APP_ENV must equal DATABASE_ENV; refusing.");
}
if (process.env.VERCEL_ENV) throw new Error("test:integration: must not run on Vercel; refusing.");

const db = createDb(config.databaseUrl);
const repo = createModerationRepo(db);
const events = createEventsRepo(db);
const PREFIX = "itest-s8-";
const admin = `user_${PREFIX}admin`;
const orgId = crypto.randomUUID();
const hashes: string[] = [];
const memberIds: string[] = [];
const now = new Date();

const make = (over: Partial<NewEvent> = {}): NewEvent => ({
  id: crypto.randomUUID(), orgId, seriesId: null, title: `${PREFIX}event`, description: "", status: "published", startsAt: new Date(now.getTime() + 3 * 86400000), endsAt: null,
  timeZone: "America/Chicago", venueName: "Hall", street: "1 St", city: "Nashville", state: "TN", zip: "37201", lat: null, lng: null, speakers: null, directions: null,
  revivalTypes: ["worship-nights"], links: [], ...over,
});
const insert = (list: NewEvent[]) =>
  events.createMany({ series: null, events: list, userId: admin, idempotencyKey: crypto.randomUUID(), audit: { actorId: admin, action: "event.create", subject: `${PREFIX}${list[0].id}` } });
const entriesFor = async (subject: string) => (await db.select().from(auditLog).where(like(auditLog.subject, `%${subject}%`)));

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: `${PREFIX}org`, nameKey: `${PREFIX}org-${orgId}`, status: "approved" });
});

afterAll(async () => {
  const eventIds = (await db.select({ id: event.id }).from(event).where(eq(event.orgId, orgId))).map((r) => r.id);
  if (eventIds.length > 0) {
    await db.delete(report).where(inArray(report.subjectId, [...eventIds, orgId]));
    await db.delete(eventRevivalType).where(inArray(eventRevivalType.eventId, eventIds));
    await db.delete(eventLink).where(inArray(eventLink.eventId, eventIds));
    await db.delete(idempotencyRecord).where(inArray(idempotencyRecord.eventId, eventIds));
  }
  await db.delete(event).where(eq(event.orgId, orgId));
  await db.delete(organizationMember).where(eq(organizationMember.orgId, orgId));
  await db.delete(organization).where(eq(organization.id, orgId));
  if (memberIds.length > 0) await db.delete(userProfile).where(inArray(userProfile.clerkUserId, memberIds));
  if (hashes.length > 0) await db.delete(reportRateLimit).where(inArray(reportRateLimit.addressHash, hashes));
  await db.delete(auditLog).where(like(auditLog.subject, `%${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.subject, `%${orgId}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `%${PREFIX}%`));
});

describe("reports against the real database", () => {
  it("only an existing public subject can be reported, and a report holds no reporter", async () => {
    const e = make();
    const draft = make({ status: "draft" });
    await insert([e, draft]);
    expect(await repo.subjectExists("event", e.id)).toBe(true);
    expect(await repo.subjectExists("event", draft.id)).toBe(false);
    expect(await repo.subjectExists("event", crypto.randomUUID())).toBe(false);
    expect(await repo.subjectExists("organization", orgId)).toBe(true);
    const hash = `${PREFIX}${crypto.randomUUID()}`;
    hashes.push(hash);
    expect(await repo.recordReport({ subjectType: "event", subjectId: e.id, reason: "not_real", details: "x", addressHash: hash, maxPerWindow: 2, since: new Date(now.getTime() - 86400000) })).toBe(true);
    const [row] = await db.select().from(report).where(eq(report.subjectId, e.id));
    expect(Object.keys(row).sort()).toEqual(["createdAt", "decidedAt", "details", "id", "reason", "status", "subjectId", "subjectType"]);
  });

  it("an address is limited within the window and the limit rows can be purged", async () => {
    const e = make();
    await insert([e]);
    const hash = `${PREFIX}${crypto.randomUUID()}`;
    hashes.push(hash);
    const send = () => repo.recordReport({ subjectType: "event", subjectId: e.id, reason: "other", details: "", addressHash: hash, maxPerWindow: 2, since: new Date(now.getTime() - 86400000) });
    expect([await send(), await send(), await send()]).toEqual([true, true, false]);
    expect(await repo.purgeRateLimits(new Date(Date.now() + 1000))).toBeGreaterThanOrEqual(2);
    expect(await send()).toBe(true);
  });

  it("a report is decided once, with its audit entry written together with the decision", async () => {
    const e = make();
    await insert([e]);
    const hash = `${PREFIX}${crypto.randomUUID()}`;
    hashes.push(hash);
    await repo.recordReport({ subjectType: "event", subjectId: e.id, reason: "other", details: "", addressHash: hash, maxPerWindow: 5, since: new Date(now.getTime() - 86400000) });
    const [r] = await db.select().from(report).where(eq(report.subjectId, e.id));
    const decide = (decision: "dismissed" | "actioned") => repo.decideReport({ id: r.id, decision, reason: "itest", actorId: admin, subject: `event:${e.id}` });
    expect(await decide("dismissed")).toBe(true);
    expect(await decide("actioned")).toBe(false);
    expect((await entriesFor(e.id)).filter((a) => a.action.startsWith("report."))).toHaveLength(1);
  });
});

describe("admin changes against the real database", () => {
  it("hiding an event changes it and writes one audit entry; hiding it again changes and writes nothing", async () => {
    const e = make();
    await insert([e]);
    const hide = () => repo.setEventModeration({ id: e.id, from: "published", to: "hidden", action: "event.hide", reason: "itest", actorId: admin, subject: `event:${e.id}` });
    expect(await hide()).toBe(true);
    expect(await hide()).toBe(false);
    expect(await repo.getEventState(e.id)).toBe("hidden");
    expect((await entriesFor(e.id)).filter((a) => a.action === "event.hide")).toHaveLength(1);
    expect(await repo.setEventModeration({ id: e.id, from: "hidden", to: "published", action: "event.restore", reason: "itest", actorId: admin, subject: `event:${e.id}` })).toBe(true);
    expect(await repo.getEventState(e.id)).toBe("published");
  });

  it("a hidden event is not public and the same change cannot be made from the wrong state", async () => {
    const e = make();
    await insert([e]);
    expect(await repo.setEventModeration({ id: e.id, from: "hidden", to: "published", action: "event.restore", reason: "itest", actorId: admin, subject: `event:${e.id}` })).toBe(false);
    expect((await entriesFor(e.id)).filter((a) => a.action === "event.restore")).toHaveLength(0);
    expect(await repo.getEventState(crypto.randomUUID())).toBeNull();
  });

  it("unpublishing a church is conditional on its state and audited once", async () => {
    const other = crypto.randomUUID();
    await db.insert(organization).values({ id: other, name: `${PREFIX}other`, nameKey: `${PREFIX}other-${other}`, status: "approved" });
    try {
      const change = (from: string, to: string) => repo.setOrganizationStatus({ id: other, from, to, action: "organization.unpublish", reason: "itest", actorId: admin, subject: `organization:${other}` });
      expect(await change("approved", "unpublished")).toBe(true);
      expect(await change("approved", "unpublished")).toBe(false);
      expect(await repo.getOrganizationStatus(other)).toBe("unpublished");
      expect((await entriesFor(other)).filter((a) => a.action === "organization.unpublish")).toHaveLength(1);
    } finally {
      await db.delete(auditLog).where(like(auditLog.subject, `%${other}%`));
      await db.delete(organization).where(eq(organization.id, other));
    }
  });

  it("suspending a member can hide the events of the churches they manage, all in one step, and is audited once", async () => {
    const member = `user_${PREFIX}manager`;
    memberIds.push(member);
    await db.insert(userProfile).values({ clerkUserId: member });
    await db.insert(organizationMember).values({ orgId, userId: member, status: "approved", decidedBy: admin });
    const e = make();
    await insert([e]);
    expect(await repo.managerIdsOfOrganization(orgId)).toContain(member);
    expect(await repo.managerIdsOfEvent(e.id)).toContain(member);
    const suspend = (hide: boolean) => repo.setSuspended({ userId: member, suspended: true, reason: "itest", actorId: admin, hideEvents: hide, subject: `member:${member}` });
    expect(await suspend(true)).toBe(true);
    expect(await suspend(true)).toBe(false); // already suspended: nothing changes, nothing is written
    expect(await repo.isSuspended(member)).toBe(true);
    expect(await repo.getEventState(e.id)).toBe("hidden");
    expect((await entriesFor(member)).filter((a) => a.action === "member.suspend")).toHaveLength(1);
    expect(await repo.setSuspended({ userId: member, suspended: false, reason: "itest", actorId: admin, hideEvents: false, subject: `member:${member}` })).toBe(true);
    expect(await repo.isSuspended(member)).toBe(false);
    expect(await repo.memberExists(member)).toBe(true);
    expect(await repo.memberExists(`user_${PREFIX}nobody`)).toBe(false);
  });

  it("suspending without hiding leaves the events alone", async () => {
    const member = `user_${PREFIX}keeper`;
    memberIds.push(member);
    await db.insert(userProfile).values({ clerkUserId: member });
    await db.insert(organizationMember).values({ orgId, userId: member, status: "approved", decidedBy: admin });
    const e = make();
    await insert([e]);
    expect(await repo.setSuspended({ userId: member, suspended: true, reason: "itest", actorId: admin, hideEvents: false, subject: `member:${member}` })).toBe(true);
    expect(await repo.getEventState(e.id)).toBe("published");
  });

  it("the overview counts, and the audit log is filtered by actor, subject and date", async () => {
    const counts = await repo.overview();
    expect(counts.suspendedMembers).toBeGreaterThanOrEqual(1);
    expect(counts.hiddenEvents).toBeGreaterThanOrEqual(1);
    const mine = await repo.listAudit({ actor: admin, limit: 500 });
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((a) => a.actorId.includes(admin))).toBe(true);
    const today = new Date().toISOString().slice(0, 10);
    expect((await repo.listAudit({ actor: admin, from: today, to: today, limit: 500 })).length).toBe(mine.length);
    expect(await repo.listAudit({ actor: admin, to: "2000-01-01", limit: 500 })).toEqual([]);
    expect(await repo.listAudit({ subject: `member:user_${PREFIX}keeper`, limit: 10 })).toHaveLength(1);
    expect(await repo.listAudit({ actor: "%", limit: 10 })).toEqual([]); // wildcard characters are matched literally, not as "everything"
    expect(await repo.listAudit({ subject: "%", limit: 10 })).toEqual([]);
  });
});
