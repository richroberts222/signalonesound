import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { localToUtc } from "@signalone/shared";

import { createFakeEventsRepo } from "../../db/events.fake";
import type { NewEvent } from "../../db/events";
import { searchPlaces } from "../places/gazetteer";
import { createDiscoverService } from "../services/discover";
import { createApiRoute } from "./handler";
import { discoverRoutes } from "./discover";

// Executable acceptance criteria for S4 (docs/features/s4-discover-web.md), verified at the API
// boundary: real Request -> adapter -> validation -> real service -> repo -> Response. Nobody is
// signed in: the whole feature is public.
//
// AC1/AC13 No identity is read and analytics receive only an event name.  AC2 Only published and
// cancelled upcoming events of approved organizations, ordered by distance or start time.
// AC3 The radius is correct at its edges.  AC4 Date filters use each event's own local date.
// AC5 Several types mean "any of", each event once.  AC6 A typed place becomes a position.
// AC7 The searcher's position is rounded.  AC9 Cancelled events show as cancelled.
// AC10 Paging returns each event once.  AC14 No free text; events that are not public do not exist.
type Json = { ok: boolean; data: any; error?: { code: string; fieldErrors?: Record<string, string[]> } }; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("S4 discover acceptance criteria (API boundary)", () => {
  const base = "http://localhost/api/v1";
  const origin = { lat: 36.16, lng: -86.78 };
  const MILE = 69.0934; // miles per degree of latitude on the sphere used by the formula
  const org = randomUUID();
  const heldOrg = randomUUID();
  const clock = new Date("2026-10-09T12:00:00Z");

  const setup = () => {
    const repo = createFakeEventsRepo(() => clock, (id) => (id === heldOrg ? { name: "Waiting Church", status: "pending" } : { name: "Sample Fellowship", status: "approved" }));
    const analytics = { count: vi.fn() };
    const searchSpy = vi.spyOn(repo, "searchPublic");
    const getUserId = vi.fn(async () => null);
    const service = createDiscoverService({ repo, places: searchPlaces, analytics, now: () => clock });
    const routes = discoverRoutes(createApiRoute({ getUserId, onUnexpected: vi.fn() }), () => service);
    const call = async (pending: Promise<Response>) => {
      const res = await pending;
      return { status: res.status, json: (await res.json()) as Json };
    };
    const api = {
      search: (query = "") => call(routes.search.GET(new Request(`${base}/events${query}`))),
      event: (id: string) => call(routes.event.GET(new Request(`${base}/events/${id}/public`), { params: Promise.resolve({ id }) })),
      places: (q: string) => call(routes.places.GET(new Request(`${base}/places/search?q=${encodeURIComponent(q)}`))),
    };
    let n = 0;
    const add = async (over: Partial<NewEvent> & { milesNorth?: number } = {}) => {
      const { milesNorth, ...rest } = over;
      const id = randomUUID();
      const startsAt = new Date(clock.getTime() + (3 + n++) * 24 * 3600 * 1000);
      const e: NewEvent = {
        id,
        orgId: org,
        seriesId: null,
        title: `Event ${n}`,
        description: "",
        status: "published",
        startsAt,
        endsAt: null,
        timeZone: "America/Chicago",
        venueName: `Venue ${n}`,
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
      await repo.createMany({ series: null, events: [e], userId: "u", idempotencyKey: randomUUID(), audit: { actorId: "u", action: "x", subject: "x" } });
      return e;
    };
    return { api, add, repo, analytics, searchSpy, getUserId };
  };
  const ids = (r: { json: Json }) => (r.json.data.items as { id: string }[]).map((i) => i.id);

  it("AC1 anyone can search without signing in, and no identity is ever read", async () => {
    const s = setup();
    await s.add();
    const r = await s.api.search();
    expect(r.status).toBe(200);
    expect(s.getUserId).not.toHaveBeenCalled();
    expect(r.json.data.items).toHaveLength(1);
  });

  it("AC2 only published and cancelled upcoming events of approved organizations are listed, soonest first", async () => {
    const s = setup();
    const first = await s.add();
    const second = await s.add();
    await s.add({ status: "draft" });
    await s.add({ orgId: heldOrg });
    await s.add({ startsAt: new Date(clock.getTime() - 24 * 3600 * 1000) });
    const deleted = await s.add();
    await s.repo.setStatus({ id: deleted.id, from: ["published"], to: "deleted", audit: { actorId: "u", action: "x", subject: "x" } });
    expect(ids(await s.api.search())).toEqual([first.id, second.id]);
  });

  it("AC3 the radius is exact at its edges and events without a position never appear in a distance search", async () => {
    const s = setup();
    const inside = await s.add({ milesNorth: 9.9 });
    const exactly = await s.add({ milesNorth: 10.0 });
    const outside = await s.add({ milesNorth: 10.1 });
    const unlocated = await s.add();
    const q = `?lat=${origin.lat}&lng=${origin.lng}`;
    const within10 = await s.api.search(`${q}&radius=10`);
    expect(ids(within10)).toEqual([inside.id, exactly.id]);
    expect(within10.json.data.items[0].distanceMiles).toBeCloseTo(9.9, 1);
    expect(ids(await s.api.search(`${q}&radius=25`))).toEqual([inside.id, exactly.id, outside.id]);
    expect(ids(await s.api.search(`${q}&radius=any`))).toEqual([inside.id, exactly.id, outside.id]);
    expect(ids(await s.api.search(q))).not.toContain(unlocated.id);
    expect(ids(await s.api.search())).toContain(unlocated.id); // without a position it is a normal event
  });

  it("with a position, results are nearest first", async () => {
    const s = setup();
    const far = await s.add({ milesNorth: 30 });
    const near = await s.add({ milesNorth: 3 });
    const mid = await s.add({ milesNorth: 12 });
    expect(ids(await s.api.search(`?lat=${origin.lat}&lng=${origin.lng}&radius=50`))).toEqual([near.id, mid.id, far.id]);
  });

  it("AC4 date filters use each event's own local date, not the UTC date", async () => {
    const s = setup();
    const lateEvening = await s.add({ startsAt: localToUtc({ year: 2026, month: 10, day: 14, hour: 23, minute: 30 }, "America/Chicago") }); // 04:30 UTC on the 15th
    const justAfter = await s.add({ startsAt: localToUtc({ year: 2026, month: 10, day: 15, hour: 0, minute: 30 }, "America/Chicago") });
    const la = await s.add({ timeZone: "America/Los_Angeles", startsAt: localToUtc({ year: 2026, month: 10, day: 14, hour: 21, minute: 0 }, "America/Los_Angeles") });
    const day14 = await s.api.search("?from=2026-10-14&to=2026-10-14");
    expect(ids(day14).sort()).toEqual([lateEvening.id, la.id].sort());
    expect(ids(await s.api.search("?from=2026-10-15&to=2026-10-15"))).toEqual([justAfter.id]);
    expect(ids(await s.api.search("?from=2026-10-14"))).toHaveLength(3);
  });

  it("AC5 several types mean any of them, and an event with several matching types is listed once", async () => {
    const s = setup();
    const both = await s.add({ revivalTypes: ["baptisms", "youth-events"] });
    const one = await s.add({ revivalTypes: ["youth-events"] });
    await s.add({ revivalTypes: ["conferences"] });
    expect(ids(await s.api.search("?types=baptisms,youth-events"))).toEqual([both.id, one.id]);
    expect(ids(await s.api.search("?types=baptisms"))).toEqual([both.id]);
  });

  it("AC6 a typed ZIP code or city becomes a position, offline", async () => {
    const s = setup();
    const zip = await s.api.places("37201");
    expect(zip.json.data.items[0]).toMatchObject({ label: "ZIP 37201" });
    expect(zip.json.data.items[0].lat).toBeCloseTo(36.16, 0);
    const city = await s.api.places("Nashville, TN");
    expect(city.json.data.items[0].label).toBe("Nashville, TN");
    expect((await s.api.places("Zzyzzx, TN")).json.data.items).toEqual([]);
    expect((await s.api.places("")).status).toBe(400);
    expect((await s.api.places("x".repeat(101))).status).toBe(400);
  });

  it("AC7 the searcher's position is rounded before it is used", async () => {
    const s = setup();
    await s.api.search("?lat=36.16789&lng=-86.78123&radius=25");
    expect(s.searchSpy.mock.calls[0][0].position).toEqual({ lat: 36.17, lng: -86.78 });
  });

  it("AC9 a cancelled event stays in the list, shown as cancelled", async () => {
    const s = setup();
    const e = await s.add();
    await s.repo.setStatus({ id: e.id, from: ["published"], to: "cancelled", audit: { actorId: "u", action: "x", subject: "x" } });
    const r = await s.api.search();
    expect(r.json.data.items[0]).toMatchObject({ id: e.id, status: "cancelled" });
  });

  it("AC10 paging returns every event once, in order, by start time and by distance", async () => {
    const s = setup();
    const made = [];
    for (const miles of [5, 1, 4, 2, 3]) made.push(await s.add({ milesNorth: miles }));
    const walk = async (query: string) => {
      const seen: string[] = [];
      let cursor: string | null = null;
      for (let page = 0; page < 6; page++) {
        const r: { json: Json } = await s.api.search(`${query}limit=2${cursor ? `&cursor=${cursor}` : ""}`);
        seen.push(...ids(r));
        cursor = r.json.data.nextCursor;
        if (!cursor) break;
      }
      return seen;
    };
    expect(await walk("?")).toEqual(made.map((e) => e.id)); // by start time
    const byDistance = [...made].sort((a, b) => (a.lat ?? 0) - (b.lat ?? 0)).map((e) => e.id);
    expect(await walk(`?lat=${origin.lat}&lng=${origin.lng}&radius=25&`)).toEqual(byDistance);
    expect((await s.api.search("?cursor=garbage")).status).toBe(400);
  });

  it("AC13 analytics receive only the name of the event", async () => {
    const s = setup();
    const e = await s.add();
    await s.api.search(`?lat=${origin.lat}&lng=${origin.lng}`);
    await s.api.event(e.id);
    expect(s.analytics.count.mock.calls).toEqual([["search"], ["event_view"]]);
  });

  it("an event page shows the public fields only", async () => {
    const s = setup();
    const e = await s.add({ milesNorth: 2, speakers: "Guest Speaker", links: ["https://sample.example"] });
    const r = await s.api.event(e.id);
    expect(r.status).toBe(200);
    expect(r.json.data).toMatchObject({ id: e.id, organization: { id: org, name: "Sample Fellowship" }, status: "published", speakers: "Guest Speaker", links: ["https://sample.example"] });
    for (const hidden of ["version", "editToken", "moderationState", "orgId", "createdBy", "isException"]) expect(Object.keys(r.json.data)).not.toContain(hidden);
  });

  it("AC14 drafts, deleted and held events, events of unapproved organizations and bad ids do not exist", async () => {
    const s = setup();
    const draft = await s.add({ status: "draft" });
    const unapproved = await s.add({ orgId: heldOrg });
    const gone = await s.add();
    await s.repo.setStatus({ id: gone.id, from: ["published"], to: "deleted", audit: { actorId: "u", action: "x", subject: "x" } });
    for (const id of [draft.id, unapproved.id, gone.id, randomUUID(), "not-a-uuid"]) expect((await s.api.event(id)).status, id).toBe(404);
  });

  it("AC14 there is no free-text search and unknown parameters are refused", async () => {
    const s = setup();
    for (const query of ["?q=revival", "?search=x", "?organizationId=not-a-uuid", "?extra=1"]) expect((await s.api.search(query)).status, query).toBe(400);
  });

  it("hostile input: bad positions, radii, types, limits and dates are refused", async () => {
    const s = setup();
    for (const query of [
      "?lat=abc&lng=1", "?lat=91&lng=0", "?lat=0&lng=181", "?lat=36.1", "?lng=-86.7", "?radius=25", "?lat=36&lng=-86&radius=0",
      "?lat=36&lng=-86&radius=1000", "?lat=36&lng=-86&radius=ten", "?types=bogus", "?types=baptisms,bogus", "?limit=0", "?limit=1000",
      "?from=2026-13-01", "?from=2026-10-15&to=2026-10-14", "?to=tomorrow",
    ]) {
      const r = await s.api.search(query);
      expect(r.status, query).toBe(400);
      expect(r.json.error?.code).toBe("validation_failed");
    }
  });
});
