import { assertDestructiveAllowed, parseDatabaseEnv } from "@signalone/shared";
import { eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { createEventsRepo, type NewEvent, type PublicSearch } from "./events";
import { auditLog, event, eventLink, eventRevivalType, idempotencyRecord, organization } from "./schema";

// Database-backed integration tests for the public search (S4, /docs/automation/integration.md). They
// run ONLY via `pnpm --filter web test:integration`, never in `pnpm test`, and are fail-closed:
// DATABASE_ENV must be explicitly `dev` or `qa`; STAGE and PROD are refused. The migrations must
// already be applied (`pnpm --filter web db:migrate -- --env=dev`).
const config = parseDatabaseEnv(process.env);
assertDestructiveAllowed(config.databaseEnv, ["dev", "qa"], "test:integration");
if (process.env.APP_ENV && process.env.APP_ENV !== config.databaseEnv) {
  throw new Error("test:integration: APP_ENV must equal DATABASE_ENV; refusing.");
}
if (process.env.VERCEL_ENV) throw new Error("test:integration: must not run on Vercel; refusing.");

const db = createDb(config.databaseUrl);
const repo = createEventsRepo(db);
const PREFIX = "itest-s4-";
const MILE = 69.0934;
const origin = { lat: 36.16, lng: -86.78 };
const now = new Date();
const days = (n: number) => new Date(now.getTime() + n * 24 * 3600 * 1000);
const orgId = crypto.randomUUID();
const heldOrgId = crypto.randomUUID();
const orgIds = [orgId, heldOrgId];
const user = `user_${PREFIX}x`;

const make = (over: Partial<NewEvent> & { milesNorth?: number }): NewEvent => {
  const { milesNorth, ...rest } = over;
  return {
    id: crypto.randomUUID(),
    orgId,
    seriesId: null,
    title: `${PREFIX}event`,
    description: "",
    status: "published",
    startsAt: days(3),
    endsAt: null,
    timeZone: "America/Chicago",
    venueName: "Hall",
    street: "1 Street",
    city: "Nashville",
    state: "TN",
    zip: "37201",
    lat: milesNorth === undefined ? null : origin.lat + milesNorth / MILE,
    lng: milesNorth === undefined ? null : origin.lng,
    speakers: null,
    directions: null,
    revivalTypes: ["worship-nights"],
    links: [],
    ...rest,
  };
};
const insert = async (events: NewEvent[]) => {
  await repo.createMany({ series: null, events, userId: user, idempotencyKey: crypto.randomUUID(), audit: { actorId: user, action: "event.create", subject: `${PREFIX}${events[0].id}` } });
};
const search = (over: Partial<PublicSearch> = {}) =>
  repo.searchPublic({ now, position: null, radius: null, types: [], cursor: null, limit: 50, organizationId: orgId, ...over });

beforeAll(async () => {
  await db.insert(organization).values([
    { id: orgId, name: `${PREFIX}approved`, nameKey: `${PREFIX}approved-${orgId}`, status: "approved" },
    { id: heldOrgId, name: `${PREFIX}pending`, nameKey: `${PREFIX}pending-${heldOrgId}`, status: "pending" },
  ]);
});

afterAll(async () => {
  const rows = await db.select({ id: event.id }).from(event).where(inArray(event.orgId, orgIds));
  const eventIds = rows.map((r) => r.id);
  for (let i = 0; i < eventIds.length; i += 500) {
    const chunk = eventIds.slice(i, i + 500);
    await db.delete(eventRevivalType).where(inArray(eventRevivalType.eventId, chunk));
    await db.delete(eventLink).where(inArray(eventLink.eventId, chunk));
    await db.delete(idempotencyRecord).where(inArray(idempotencyRecord.eventId, chunk));
  }
  await db.delete(event).where(inArray(event.orgId, orgIds));
  await db.delete(organization).where(inArray(organization.id, orgIds));
  await db.delete(auditLog).where(like(auditLog.subject, `%${PREFIX}%`));
});

describe("public search against the real database", () => {
  it("lists only published and cancelled upcoming events of approved organizations that no admin holds", async () => {
    const live = make({ title: `${PREFIX}live` });
    const draft = make({ status: "draft" });
    const past = make({ startsAt: days(-2) });
    const gone = make({});
    const held = make({});
    const cancelled = make({ startsAt: days(4) });
    const otherOrg = make({ orgId: heldOrgId });
    await insert([live, draft, past, gone, held, cancelled]);
    await insert([otherOrg]);
    await repo.setStatus({ id: gone.id, from: ["published"], to: "deleted", audit: { actorId: user, action: "event.delete", subject: `${PREFIX}${gone.id}` } });
    await repo.setStatus({ id: cancelled.id, from: ["published"], to: "cancelled", audit: { actorId: user, action: "event.cancel", subject: `${PREFIX}${cancelled.id}` } });
    await db.update(event).set({ moderationState: "hidden" }).where(eq(event.id, held.id));
    const rows = await search();
    expect(rows.map((r) => r.id)).toEqual([live.id, cancelled.id]);
    expect(rows[1].status).toBe("cancelled");
    expect(rows[0].orgName).toBe(`${PREFIX}approved`);
    // Across all organizations: the pending organization's event must not appear at all.
    const everyone = (await search({ organizationId: undefined, limit: 500 })).map((r) => r.id);
    expect(everyone).toContain(live.id);
    expect(everyone).not.toContain(otherOrg.id);
    expect(await repo.getPublic(draft.id)).toBeNull();
    expect(await repo.getPublic(held.id)).toBeNull();
    expect(await repo.getPublic(otherOrg.id)).toBeNull();
    expect((await repo.getPublic(past.id))?.id).toBe(past.id); // an old link still works
  });

  it("the radius is exact at its edges and sorted nearest first; events without a position are left out", async () => {
    const inside = make({ milesNorth: 9.9 });
    const exactly = make({ milesNorth: 10.0 });
    const outside = make({ milesNorth: 10.1 });
    const near = make({ milesNorth: 2 });
    const unlocated = make({});
    await insert([inside, exactly, outside, near, unlocated]);
    const at = { position: origin, organizationId: orgId };
    const ten = await search({ ...at, radius: 10 });
    const idsTen = ten.map((r) => r.id).filter((id) => [inside, exactly, outside, near, unlocated].some((e) => e.id === id));
    expect(idsTen).toEqual([near.id, inside.id, exactly.id]);
    expect(ten.find((r) => r.id === inside.id)?.distance).toBeCloseTo(9.9, 1);
    const twentyFive = (await search({ ...at, radius: 25 })).map((r) => r.id);
    expect(twentyFive).toContain(outside.id);
    expect(twentyFive).not.toContain(unlocated.id);
    expect((await search({ ...at, radius: null })).map((r) => r.id)).not.toContain(unlocated.id);
  });

  it("date filters use each event's own local date", async () => {
    const date = new Date(Date.UTC(2031, 5, 14, 4, 30)); // 23:30 on June 13 in Chicago (UTC-5), but the 14th in UTC
    const evening = make({ startsAt: date, title: `${PREFIX}evening` });
    const la = make({ startsAt: new Date(Date.UTC(2031, 5, 14, 4, 0)), timeZone: "America/Los_Angeles" }); // 9:00 PM on June 13 in Los Angeles
    const next = make({ startsAt: new Date(Date.UTC(2031, 5, 14, 6, 30)) }); // 1:30 AM on June 14 in Chicago
    await insert([evening, la, next]);
    const onThe13th = (await search({ from: "2031-06-13", to: "2031-06-13" })).map((r) => r.id);
    expect(onThe13th.sort()).toEqual([evening.id, la.id].sort());
    expect((await search({ from: "2031-06-14", to: "2031-06-14" })).map((r) => r.id)).toEqual([next.id]);
  });

  it("several types mean any of them, and an event matching more than one is listed once", async () => {
    const both = make({ revivalTypes: ["baptisms", "youth-events"], startsAt: days(40) });
    const one = make({ revivalTypes: ["youth-events"], startsAt: days(41) });
    const none = make({ revivalTypes: ["conferences"], startsAt: days(42) });
    await insert([both, one, none]);
    const found = (await search({ types: ["baptisms", "youth-events"] })).map((r) => r.id);
    expect(found).toEqual([both.id, one.id]);
    expect(found).not.toContain(none.id);
  });

  it("keyset paging returns each event once, by start time and by distance", async () => {
    const group = [5, 1, 4, 2, 3].map((miles, i) => make({ milesNorth: miles, startsAt: days(60 + i), venueName: `Paged ${miles}` }));
    await insert(group);
    const walk = async (position: PublicSearch["position"]) => {
      const seen: string[] = [];
      let cursor: PublicSearch["cursor"] = null;
      for (let page = 0; page < 60; page++) {
        const rows = await search({ position, radius: position ? 30 : null, from: "2000-01-01", cursor, limit: 2, types: [] });
        const here = rows.slice(0, 2);
        seen.push(...here.map((r) => r.id));
        if (rows.length <= 2) break;
        const last = here[here.length - 1];
        cursor = { distance: last.distance, startsAt: last.startsAt, id: last.id };
      }
      return seen.filter((id) => group.some((e) => e.id === id));
    };
    const byDistance = [...group].sort((a, b) => (a.lat ?? 0) - (b.lat ?? 0)).map((e) => e.id);
    const byTime = group.map((e) => e.id);
    const withPosition = await walk(origin);
    expect(withPosition).toEqual(byDistance);
    expect(new Set(withPosition).size).toBe(withPosition.length);
    const withoutPosition = (await walk(null)).filter((id) => byTime.includes(id));
    expect(withoutPosition).toEqual(byTime);
  });

  it("stays fast with thousands of events", async () => {
    const many: NewEvent[] = Array.from({ length: 3000 }, (_, i) =>
      make({
        startsAt: days(100 + (i % 300)),
        milesNorth: ((i * 7) % 400) / 10,
        venueName: `Load ${i}`,
        revivalTypes: [i % 2 === 0 ? "conferences" : "worship-nights"],
      }),
    );
    for (let i = 0; i < many.length; i += 500) await insert(many.slice(i, i + 500));
    const timings: number[] = [];
    for (let i = 0; i < 10; i++) {
      const t = performance.now();
      const rows = await search({ position: origin, radius: 25, types: ["conferences"], limit: 20 });
      timings.push(performance.now() - t);
      expect(rows.length).toBeGreaterThan(0);
    }
    timings.sort((a, b) => a - b);
    const p95 = timings[Math.floor(timings.length * 0.95) - 1] ?? timings[timings.length - 1];
    // Generous bound: this includes a network round trip to the hosted dev database (S4 AC12).
    expect(p95).toBeLessThan(2000);
  }, 120_000);
});
