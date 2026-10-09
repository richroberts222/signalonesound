import { assertDestructiveAllowed, parseDatabaseEnv } from "@signalone/shared";
import { inArray, like } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { createEventsRepo, type NewEvent } from "./events";
import { auditLog, event, eventLink, eventRevivalType, eventSeries, idempotencyRecord } from "./schema";

// Database-backed integration tests for events (S3, /docs/automation/integration.md). They run ONLY
// via `pnpm --filter web test:integration`, never in `pnpm test`, and are fail-closed: DATABASE_ENV
// must be explicitly `dev` or `qa`; STAGE and PROD are refused. The migrations must already be applied
// (`pnpm --filter web db:migrate -- --env=dev`).
const config = parseDatabaseEnv(process.env);
assertDestructiveAllowed(config.databaseEnv, ["dev", "qa"], "test:integration");
if (process.env.APP_ENV && process.env.APP_ENV !== config.databaseEnv) {
  throw new Error("test:integration: APP_ENV must equal DATABASE_ENV; refusing.");
}
if (process.env.VERCEL_ENV) throw new Error("test:integration: must not run on Vercel; refusing.");

const db = createDb(config.databaseUrl);
const repo = createEventsRepo(db);
const PREFIX = "itest-s3-";
const orgs = new Set<string>();
const users = new Set<string>();

const newOrg = () => {
  const id = crypto.randomUUID();
  orgs.add(id);
  return id;
};
const newUser = () => {
  const id = `user_${PREFIX}${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  users.add(id);
  return id;
};
const hours = (n: number) => new Date(Date.now() + n * 3600 * 1000);
const make = (orgId: string, over: Partial<NewEvent> = {}): NewEvent => ({
  id: crypto.randomUUID(),
  orgId,
  seriesId: null,
  title: `${PREFIX}event`,
  description: "integration test",
  status: "published",
  startsAt: hours(48),
  endsAt: hours(50),
  timeZone: "America/Chicago",
  venueName: "Integration Hall",
  street: "1 Test Street",
  city: "Nashville",
  state: "TN",
  zip: "37201",
  lat: null,
  lng: null,
  speakers: null,
  directions: null,
  revivalTypes: ["worship-nights", "tent-revivals"],
  links: ["https://one.example", "https://two.example"],
  ...over,
});
const create = async (e: NewEvent, userId = newUser(), key = crypto.randomUUID()) => {
  await repo.createMany({ series: null, events: [e], userId, idempotencyKey: key, audit: { actorId: userId, action: "event.create", subject: `${PREFIX}${e.id}` } });
  return { userId, key };
};

afterAll(async () => {
  // Test cleanup only: application code never deletes audit entries (the log is append-only).
  const ids = [...orgs];
  if (ids.length > 0) {
    const rows = await db.select({ id: event.id }).from(event).where(inArray(event.orgId, ids));
    const eventIds = rows.map((r) => r.id);
    if (eventIds.length > 0) {
      await db.delete(eventRevivalType).where(inArray(eventRevivalType.eventId, eventIds));
      await db.delete(eventLink).where(inArray(eventLink.eventId, eventIds));
      await db.delete(idempotencyRecord).where(inArray(idempotencyRecord.eventId, eventIds));
    }
    await db.delete(event).where(inArray(event.orgId, ids));
    await db.delete(eventSeries).where(inArray(eventSeries.orgId, ids));
  }
  await db.delete(auditLog).where(like(auditLog.subject, `%${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `%${PREFIX}%`));
});

describe("events against the real database", () => {
  it("creates an event with its revival types and ordered links, and reads it back", async () => {
    const orgId = newOrg();
    const e = make(orgId);
    await create(e);
    const found = await repo.getById(e.id);
    expect(found).toMatchObject({ id: e.id, orgId, status: "published", version: 1, timeZone: "America/Chicago", lat: null });
    expect(found?.revivalTypes).toEqual(["tent-revivals", "worship-nights"]);
    expect(found?.links).toEqual(["https://one.example", "https://two.example"]);
    expect(found?.startsAt.getTime()).toBe(e.startsAt.getTime());
  });

  it("a reused key creates nothing at all (the whole batch is rolled back) and a series is created together", async () => {
    const orgId = newOrg();
    const { userId, key } = await create(make(orgId));
    const second = make(orgId, { title: `${PREFIX}second`, startsAt: hours(100), endsAt: hours(101) });
    await expect(
      repo.createMany({ series: null, events: [second], userId, idempotencyKey: key, audit: { actorId: userId, action: "event.create", subject: `${PREFIX}${second.id}` } }),
    ).rejects.toMatchObject({ kind: "unique_violation" });
    expect(await repo.getById(second.id)).toBeNull();
    expect(await repo.findIdempotent(userId, key, hours(-24))).not.toBeNull();

    const seriesId = crypto.randomUUID();
    const a = make(orgId, { seriesId, startsAt: hours(200), endsAt: null, venueName: "Series Hall" });
    const b = make(orgId, { seriesId, startsAt: hours(368), endsAt: null, venueName: "Series Hall" });
    await repo.createMany({ series: { id: seriesId, orgId, rule: "{}" }, events: [a, b], userId: newUser(), idempotencyKey: crypto.randomUUID(), audit: { actorId: userId, action: "event.create", subject: `${PREFIX}${a.id}` } });
    expect((await repo.listSeriesFollowers(seriesId, hours(0))).map((e) => e.id)).toEqual([a.id, b.id]);
  });

  it("an edit with the current version applies everything and bumps the version; a stale one changes nothing at all", async () => {
    const orgId = newOrg();
    const e = make(orgId);
    const { userId } = await create(e);
    const audit = (action: string) => ({ actorId: userId, action, subject: `${PREFIX}${e.id}`, detail: "itest" });

    const ok = await repo.applyUpdates({ primaryId: e.id, expectedVersion: 1, updates: [{ id: e.id, fields: { title: "Edited" }, types: ["baptisms"], links: ["https://new.example"] }], audit: audit("event.update") });
    expect(ok).toBe(true);
    expect(await repo.getById(e.id)).toMatchObject({ title: "Edited", version: 2, revivalTypes: ["baptisms"], links: ["https://new.example"] });

    const stale = await repo.applyUpdates({ primaryId: e.id, expectedVersion: 1, updates: [{ id: e.id, fields: { title: "From an old copy" }, types: ["other"], links: [] }], audit: audit("event.stale") });
    expect(stale).toBe(false);
    expect(await repo.getById(e.id)).toMatchObject({ title: "Edited", version: 2, revivalTypes: ["baptisms"], links: ["https://new.example"] }); // nothing changed
    const entries = (await repo.getMany([e.id])).length && (await db.select().from(auditLog).where(like(auditLog.subject, `%${e.id}%`)));
    expect((entries as { action: string }[]).map((a) => a.action).sort()).toEqual(["event.create", "event.update"]); // no audit entry for the stale edit
  });

  it("a status change only happens from an allowed state, and is audited once", async () => {
    const orgId = newOrg();
    const e = make(orgId, { status: "draft" });
    const { userId } = await create(e);
    const audit = (action: string) => ({ actorId: userId, action, subject: `${PREFIX}${e.id}` });
    expect(await repo.setStatus({ id: e.id, from: ["published"], to: "cancelled", audit: audit("event.cancel") })).toBeNull(); // a draft cannot be cancelled
    expect(await repo.setStatus({ id: e.id, from: ["draft"], to: "published", audit: audit("event.publish") })).toBe(2);
    expect(await repo.setStatus({ id: e.id, from: ["draft"], to: "published", audit: audit("event.publish") })).toBeNull(); // not a second time
    const entries = await db.select().from(auditLog).where(like(auditLog.subject, `%${e.id}%`));
    expect(entries.filter((a) => a.action === "event.publish")).toHaveLength(1);
    expect(entries.some((a) => a.action === "event.cancel")).toBe(false);
  });

  it("lists upcoming, past and draft events with keyset paging, and never lists deleted ones", async () => {
    const orgId = newOrg();
    const user = newUser();
    const future = [1, 2, 3, 4, 5].map((n) => make(orgId, { startsAt: hours(24 * n), endsAt: null, venueName: `Hall ${n}` }));
    const past = make(orgId, { startsAt: hours(-48), endsAt: null, venueName: "Old Hall" });
    const draft = make(orgId, { status: "draft", startsAt: hours(300), endsAt: null, venueName: "Draft Hall" });
    const gone = make(orgId, { startsAt: hours(400), endsAt: null, venueName: "Gone Hall" });
    for (const e of [...future, past, draft, gone]) await create(e, user);
    await repo.setStatus({ id: gone.id, from: ["published"], to: "deleted", audit: { actorId: user, action: "event.delete", subject: `${PREFIX}${gone.id}` } });

    const seen: string[] = [];
    let cursor: { startsAt: Date; id: string } | null = null;
    for (let page = 0; page < 6; page++) {
      const rows = await repo.listByOrg(orgId, "upcoming", new Date(), cursor, 2);
      seen.push(...rows.slice(0, 2).map((r) => r.id));
      if (rows.length <= 2) break;
      const last = rows[1];
      cursor = { startsAt: last.startsAt, id: last.id };
    }
    expect(seen).toEqual(future.map((e) => e.id));
    expect((await repo.listByOrg(orgId, "past", new Date(), null, 10)).map((r) => r.id)).toEqual([past.id]);
    expect((await repo.listByOrg(orgId, "drafts", new Date(), null, 10)).map((r) => r.id)).toEqual([draft.id]);
  });

  it("finds an overlapping live event at the same venue, ignoring case, other venues, other days and cancelled events", async () => {
    const orgId = newOrg();
    const user = newUser();
    const e = make(orgId, { venueName: "Overlap Hall", startsAt: hours(500), endsAt: hours(503) });
    await create(e, user);
    expect((await repo.findOverlap(orgId, "  overlap hall ", hours(501), hours(502), []))?.id).toBe(e.id);
    expect(await repo.findOverlap(orgId, "Overlap Hall", hours(501), hours(502), [e.id])).toBeNull();
    expect(await repo.findOverlap(orgId, "Another Hall", hours(501), hours(502), [])).toBeNull();
    expect(await repo.findOverlap(orgId, "Overlap Hall", hours(504), hours(506), [])).toBeNull();
    await repo.setStatus({ id: e.id, from: ["published"], to: "cancelled", audit: { actorId: user, action: "event.cancel", subject: `${PREFIX}${e.id}` } });
    expect(await repo.findOverlap(orgId, "Overlap Hall", hours(501), hours(502), [])).toBeNull();
  });
});
