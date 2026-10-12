import { assertDestructiveAllowed, parseDatabaseEnv } from "@signalone/shared";
import { inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { createEventsRepo, type NewEvent } from "./events";
import { createFiresRepo } from "./fires";
import { createMemberRepo } from "./member";
import { auditLog, event, eventFire, eventLink, eventRevivalType, idempotencyRecord, organization } from "./schema";

// Database-backed integration tests for fires (S19, /docs/automation/integration.md). They run ONLY via
// `pnpm --filter web test:integration`, never in `pnpm test`, and are fail-closed: DATABASE_ENV must be explicitly
// `dev` or `qa`; STAGE and PROD are refused. The migrations must already be applied
// (`pnpm --filter web db:migrate -- --env=dev`).
const config = parseDatabaseEnv(process.env);
assertDestructiveAllowed(config.databaseEnv, ["dev", "qa"], "test:integration");
if (process.env.APP_ENV && process.env.APP_ENV !== config.databaseEnv) {
  throw new Error("test:integration: APP_ENV must equal DATABASE_ENV; refusing.");
}
if (process.env.VERCEL_ENV) throw new Error("test:integration: must not run on Vercel; refusing.");

const db = createDb(config.databaseUrl);
const fires = createFiresRepo(db);
const events = createEventsRepo(db);
const members = createMemberRepo(db);
const PREFIX = "itest-s19-";
const orgId = crypto.randomUUID();
const users = new Set<string>();
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
  events.createMany({ series: null, events: list, userId: `user_${PREFIX}maker`, idempotencyKey: crypto.randomUUID(), audit: { actorId: `user_${PREFIX}maker`, action: "event.create", subject: `${PREFIX}x` } });

beforeAll(async () => {
  await db.insert(organization).values({ id: orgId, name: `${PREFIX}org`, nameKey: `${PREFIX}org-${orgId}`, status: "approved" });
});

afterAll(async () => {
  const ids = (await db.select({ id: event.id }).from(event).where(inArray(event.orgId, [orgId]))).map((r) => r.id);
  if (ids.length > 0) {
    await db.delete(eventFire).where(inArray(eventFire.eventId, ids));
    await db.delete(eventRevivalType).where(inArray(eventRevivalType.eventId, ids));
    await db.delete(eventLink).where(inArray(eventLink.eventId, ids));
    await db.delete(idempotencyRecord).where(inArray(idempotencyRecord.eventId, ids));
  }
  await db.delete(eventFire).where(like(eventFire.userId, `%${PREFIX}%`));
  await db.delete(event).where(inArray(event.orgId, [orgId]));
  await db.delete(organization).where(inArray(organization.id, [orgId]));
  await db.delete(auditLog).where(like(auditLog.subject, `%${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `%${PREFIX}%`));
});

describe("fires against the real database", () => {
  it("giving a fire twice is once, taking it back works, and one person's fire is not another's", async () => {
    const alice = newUser();
    const bob = newUser();
    const e = make({});
    await insert([e]);
    await fires.fire(alice, e.id);
    await fires.fire(alice, e.id);
    expect(await fires.isFired(alice, e.id)).toBe(true);
    expect(await fires.isFired(bob, e.id)).toBe(false);
    await fires.unfire(bob, e.id); // bob has none: quiet
    expect(await fires.isFired(alice, e.id)).toBe(true);
    await fires.unfire(alice, e.id);
    expect(await fires.isFired(alice, e.id)).toBe(false);
  });

  it("the public total is counted with the event: one number per event, across people", async () => {
    const a = make({ title: `${PREFIX}a` });
    const b = make({ title: `${PREFIX}b` });
    const none = make({ title: `${PREFIX}none` });
    await insert([a, b, none]);
    await fires.fire(newUser(), a.id);
    await fires.fire(newUser(), a.id);
    await fires.fire(newUser(), a.id);
    await fires.fire(newUser(), b.id);
    const found = new Map((await events.getManyWithOrg([a.id, b.id, none.id])).map((r) => [r.id, r.fireCount]));
    expect(found.get(a.id)).toBe(3);
    expect(found.get(b.id)).toBe(1);
    expect(found.get(none.id)).toBe(0);
    expect((await events.getPublic(a.id))?.fireCount).toBe(3);
  });

  it("counts only the fires a person gave since a moment (the daily limit)", async () => {
    const who = newUser();
    const e1 = make({});
    const e2 = make({});
    await insert([e1, e2]);
    await fires.fire(who, e1.id);
    await fires.fire(who, e2.id);
    expect(await fires.countSince(who, new Date(now.getTime() - 60_000))).toBe(2);
    expect(await fires.countSince(who, new Date(Date.now() + 60_000))).toBe(0);
  });

  it("the retention job removes fires 30 days after the event ended, and only those", async () => {
    const who = newUser();
    const old = make({ startsAt: days(-40), endsAt: days(-39) });
    const recent = make({ startsAt: days(-5), endsAt: days(-4) });
    const upcoming = make({ startsAt: days(5) });
    await insert([old, recent, upcoming]);
    for (const e of [old, recent, upcoming]) await fires.fire(who, e.id);
    expect(await fires.purgeEnded(days(-30))).toBeGreaterThanOrEqual(1);
    expect(await fires.isFired(who, old.id)).toBe(false);
    expect(await fires.isFired(who, recent.id)).toBe(true);
    expect(await fires.isFired(who, upcoming.id)).toBe(true);
  });

  it("deleting an account removes the person's fires (and only theirs)", async () => {
    const leaver = newUser();
    const stayer = newUser();
    const e = make({});
    await insert([e]);
    await fires.fire(leaver, e.id);
    await fires.fire(stayer, e.id);
    expect(Object.keys(await members.exportAll(leaver))).toContain("event_fire");
    expect((await members.exportAll(leaver)).event_fire).toHaveLength(1);
    await members.eraseAll(leaver);
    expect(await fires.isFired(leaver, e.id)).toBe(false);
    expect(await fires.isFired(stayer, e.id)).toBe(true);
  });
});
