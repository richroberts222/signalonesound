import { assertDestructiveAllowed, parseDatabaseEnv } from "@signalone/shared";
import { inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { createEventsRepo, type NewEvent } from "./events";
import { createMemberRepo } from "./member";
import { createSavedRepo } from "./saved";
import { auditLog, event, eventLink, eventRevivalType, idempotencyRecord, inviteToken, organization, savedEvent } from "./schema";

// Database-backed integration tests for saved events and invites (S6, /docs/automation/integration.md).
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
const saved = createSavedRepo(db);
const events = createEventsRepo(db);
const members = createMemberRepo(db);
const PREFIX = "itest-s6-";
const orgId = crypto.randomUUID();
const users = new Set<string>();
const hashes = new Set<string>();
const now = new Date();
const days = (n: number) => new Date(now.getTime() + n * 24 * 3600 * 1000);
const newUser = () => {
  const id = `user_${PREFIX}${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  users.add(id);
  return id;
};
const make = (over: Partial<NewEvent>): NewEvent => ({
  id: crypto.randomUUID(), orgId, seriesId: null, title: `${PREFIX}e`, description: "", status: "published", startsAt: days(3), endsAt: null,
  timeZone: "America/Chicago", venueName: "Hall", street: "1 St", city: "Nashville", state: "TN", zip: "37201", lat: null, lng: null,
  speakers: null, directions: null, revivalTypes: ["worship-nights"], links: [], ...over,
});
const insert = async (list: NewEvent[]) =>
  events.createMany({ series: null, events: list, userId: `user_${PREFIX}maker`, idempotencyKey: crypto.randomUUID(), audit: { actorId: `user_${PREFIX}maker`, action: "event.create", subject: `${PREFIX}${list[0].id}` } });

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: `${PREFIX}org`, nameKey: `${PREFIX}org-${orgId}`, status: "approved" });
});

afterAll(async () => {
  const ids = (await db.select({ id: event.id }).from(event).where(inArray(event.orgId, [orgId]))).map((r) => r.id);
  if (ids.length > 0) {
    await db.delete(savedEvent).where(inArray(savedEvent.eventId, ids));
    await db.delete(eventRevivalType).where(inArray(eventRevivalType.eventId, ids));
    await db.delete(eventLink).where(inArray(eventLink.eventId, ids));
    await db.delete(idempotencyRecord).where(inArray(idempotencyRecord.eventId, ids));
  }
  await db.delete(event).where(inArray(event.orgId, [orgId]));
  await db.delete(organization).where(inArray(organization.id, [orgId]));
  if (hashes.size > 0) await db.delete(inviteToken).where(inArray(inviteToken.tokenHash, [...hashes]));
  await db.delete(inviteToken).where(like(inviteToken.createdBy, `%${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.subject, `%${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `%${PREFIX}%`));
});

describe("saved events against the real database", () => {
  it("saving twice is once, and a list is private to its owner", async () => {
    const alice = newUser();
    const bob = newUser();
    const e = make({});
    await insert([e]);
    await saved.save(alice, e.id);
    await saved.save(alice, e.id);
    expect(await saved.countByUser(alice)).toBe(1);
    expect((await saved.list(alice, now, null, 10)).map((r) => r.eventId)).toEqual([e.id]);
    expect(await saved.list(bob, now, null, 10)).toEqual([]);
    await saved.remove(bob, e.id); // not bob's: nothing happens
    expect(await saved.countByUser(alice)).toBe(1);
    await saved.remove(alice, e.id);
    await saved.remove(alice, e.id); // twice is fine
    expect(await saved.countByUser(alice)).toBe(0);
  });

  it("lists upcoming events first, soonest first, then past ones, with keyset paging that repeats nothing", async () => {
    const user = newUser();
    const upcoming = [4, 2, 7].map((d) => make({ startsAt: days(d), venueName: `S6 up ${d}` }));
    const past = [-3, -9].map((d) => make({ startsAt: days(d), venueName: `S6 past ${d}` }));
    await insert([...upcoming, ...past]);
    for (const e of [...upcoming, ...past]) await saved.save(user, e.id);
    const expected = [...upcoming].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).map((e) => e.id).concat([...past].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).map((e) => e.id));
    const seen: string[] = [];
    let cursor: Parameters<typeof saved.list>[2] = null;
    for (let page = 0; page < 8; page++) {
      const rows = await saved.list(user, now, cursor, 2);
      seen.push(...rows.slice(0, 2).map((r) => r.eventId));
      if (rows.length <= 2) break;
      const last = rows[1];
      cursor = { past: last.past, startsAt: last.startsAt, eventId: last.eventId };
    }
    expect(seen).toEqual(expected);
  });

  it("the retention job removes only events that ended before the cutoff, whichever way their end is recorded", async () => {
    const user = newUser();
    const longAgo = make({ startsAt: days(-60), endsAt: days(-59.9), venueName: "S6 old ended" });
    const longAgoNoEnd = make({ startsAt: days(-45), endsAt: null, venueName: "S6 old no end" });
    const recent = make({ startsAt: days(-10), endsAt: days(-9.9), venueName: "S6 recent" });
    const future = make({ startsAt: days(20), venueName: "S6 future" });
    await insert([longAgo, longAgoNoEnd, recent, future]);
    for (const e of [longAgo, longAgoNoEnd, recent, future]) await saved.save(user, e.id);
    const removed = await saved.purgeEnded(days(-30));
    expect(removed).toBeGreaterThanOrEqual(2);
    expect((await saved.list(user, now, null, 10)).map((r) => r.eventId).sort()).toEqual([recent.id, future.id].sort());
  });
});

describe("invites against the real database", () => {
  it("counts arrivals only for a real, unexpired link, and removes expired links", async () => {
    const user = newUser();
    const live = `${PREFIX}live-${crypto.randomUUID()}`;
    const expired = `${PREFIX}expired-${crypto.randomUUID()}`;
    hashes.add(live).add(expired);
    await saved.createInvite(live, user, days(10));
    await saved.createInvite(expired, user, days(-1));
    expect(await saved.recordArrival(live, now)).toBe(true);
    expect(await saved.recordArrival(live, now)).toBe(true);
    expect(await saved.recordArrival(expired, now)).toBe(false);
    expect(await saved.recordArrival("nope", now)).toBe(false);
    const rows = await db.select().from(inviteToken).where(inArray(inviteToken.tokenHash, [live, expired]));
    expect(rows.find((r) => r.tokenHash === live)?.arrivals).toBe(2);
    expect(rows.find((r) => r.tokenHash === expired)?.arrivals).toBe(0);
    expect(await saved.countInvitesSince(user, days(-1))).toBe(2);
    expect(await saved.purgeExpiredInvites(now)).toBeGreaterThanOrEqual(1);
    expect((await db.select().from(inviteToken).where(inArray(inviteToken.tokenHash, [expired]))).length).toBe(0);
  });
});

describe("account deletion removes saved events and invite links", () => {
  it("export holds the person's own rows only, and erase removes them", async () => {
    const alice = newUser();
    const bob = newUser();
    const e = make({});
    await insert([e]);
    await saved.save(alice, e.id);
    await saved.save(bob, e.id);
    const hash = `${PREFIX}erase-${crypto.randomUUID()}`;
    hashes.add(hash);
    await saved.createInvite(hash, alice, days(5));
    const exported = await members.exportAll(alice);
    expect(exported.saved_event).toHaveLength(1);
    expect(exported.invite_token).toHaveLength(1);
    await members.eraseAll(alice);
    expect(await saved.countByUser(alice)).toBe(0);
    expect((await db.select().from(inviteToken).where(inArray(inviteToken.tokenHash, [hash]))).length).toBe(0);
    expect(await saved.countByUser(bob)).toBe(1); // another person's list is untouched
  });
});
