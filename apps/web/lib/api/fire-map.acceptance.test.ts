import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { createFakeEventsRepo } from "../../db/events.fake";
import type { NewEvent } from "../../db/events";
import usStates from "../fire-map/data/us-states.json";
import { landAreaSquareMiles, type Region } from "../fire-map/geo";
import { createFireMapService } from "../services/fire-map";
import { createApiRoute } from "./handler";
import { fireMapRoutes } from "./fire-map";

// Executable acceptance criteria for S16 (docs/features/s16-fire-map.md), verified at the API boundary: real
// Request -> adapter -> real service -> repo -> Response. Nobody is signed in: the whole feature is public.
//
// AC1 Public; only published, not cancelled, not past events with a place.  AC2 The response shape and totals.
// AC3 One fire is about 314 square miles and overlapping fires are not double counted.  AC4 A fire on the ocean
// adds no land and no region.  AC5 Regions are found from the coordinates.
type Json = { ok: boolean; data: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("S16 fire map acceptance criteria (API boundary)", () => {
  const org = randomUUID();
  const heldOrg = randomUUID();
  const clock = new Date("2026-10-09T12:00:00Z");
  const KANSAS = { lat: 38.5, lng: -98.4 };
  const NASHVILLE = { lat: 36.16, lng: -86.78 };
  const ATLANTIC = { lat: 30, lng: -40 };

  const setup = () => {
    const repo = createFakeEventsRepo(() => clock, (id) => (id === heldOrg ? { name: "Waiting Church", status: "pending" } : { name: "Sample Fellowship", status: "approved" }));
    const getUserId = vi.fn(async () => null);
    const service = createFireMapService({ repo, now: () => clock });
    const routes = fireMapRoutes(createApiRoute({ getUserId, onUnexpected: vi.fn() }), () => service);
    const get = async () => {
      const res = await routes.get.GET(new Request("http://localhost/api/v1/fire-map"));
      return { status: res.status, json: (await res.json()) as Json };
    };
    let n = 0;
    const add = async (over: Partial<NewEvent> & { at?: { lat: number; lng: number } | null } = {}) => {
      const { at, ...rest } = over;
      const place = at === undefined ? NASHVILLE : at;
      const e: NewEvent = {
        id: randomUUID(),
        orgId: org,
        seriesId: null,
        title: `Fire ${++n}`,
        description: "",
        status: "published",
        startsAt: new Date(clock.getTime() + 24 * 3600 * 1000),
        endsAt: null,
        timeZone: "America/Chicago",
        venueName: `Venue ${n}`,
        street: "1 Street",
        city: "Nashville",
        state: "TN",
        zip: "37201",
        lat: place ? place.lat : null,
        lng: place ? place.lng : null,
        speakers: null,
        directions: null,
        revivalTypes: ["worship-nights"],
        links: [],
        ...rest,
      };
      await repo.createMany({ series: null, events: [e], userId: "u", idempotencyKey: randomUUID(), audit: { actorId: "u", action: "x", subject: "x" } });
      return e;
    };
    return { get, add, repo, getUserId };
  };

  it("AC1 anyone can read it, and only published, not cancelled, not past events with a place are fires", async () => {
    const s = setup();
    const shown = await s.add();
    const ongoing = await s.add({ startsAt: new Date(clock.getTime() - 3600 * 1000), endsAt: new Date(clock.getTime() + 3600 * 1000) });
    await s.add({ status: "draft" });
    await s.add({ orgId: heldOrg });
    await s.add({ at: null });
    await s.add({ startsAt: new Date(clock.getTime() - 48 * 3600 * 1000), endsAt: new Date(clock.getTime() - 24 * 3600 * 1000) });
    const cancelled = await s.add();
    await s.repo.setStatus({ id: cancelled.id, from: ["published"], to: "cancelled", audit: { actorId: "u", action: "x", subject: "x" } });
    const deleted = await s.add();
    await s.repo.setStatus({ id: deleted.id, from: ["published"], to: "deleted", audit: { actorId: "u", action: "x", subject: "x" } });

    const r = await s.get();
    expect(r.status).toBe(200);
    expect(s.getUserId).not.toHaveBeenCalled();
    expect((r.json.data.fires as { id: string }[]).map((f) => f.id).sort()).toEqual([shown.id, ongoing.id].sort());
  });

  it("AC2 the response has the numbers for the world and the United States", async () => {
    const s = setup();
    await s.add();
    const { data } = (await s.get()).json;
    expect(data.world.regionsTotal).toBeGreaterThanOrEqual(177);
    expect(data.us.regionsTotal).toBe(51);
    for (const v of [data.world, data.us]) {
      expect(v.fires).toBe(1);
      expect(v.regionsWithFire).toBe(1);
      expect(v.landPercent).toBeGreaterThan(0);
    }
    expect(data.asOf).toBe(clock.toISOString());
    expect(data.fires[0].place).toBe("Nashville, TN");
  });

  it("AC3 one fire covers about 314 square miles and overlapping fires are not counted twice", async () => {
    const usLand = landAreaSquareMiles(usStates as Region[]);
    const one = setup();
    await one.add({ at: KANSAS });
    const single = (await one.get()).json.data.us.landPercent as number;
    const expected = ((Math.PI * 100) / usLand) * 100;
    expect(Math.abs(single - expected) / expected).toBeLessThan(0.05);

    const two = setup();
    await two.add({ at: KANSAS });
    await two.add({ at: { lat: KANSAS.lat + 1 / 69.09, lng: KANSAS.lng } });
    const overlapping = (await two.get()).json.data.us.landPercent as number;
    expect(overlapping).toBeGreaterThan(single);
    expect(overlapping).toBeLessThan(single * 1.2);

    const apart = setup();
    await apart.add({ at: KANSAS });
    await apart.add({ at: NASHVILLE });
    expect(((await apart.get()).json.data.us.landPercent as number) / single).toBeGreaterThan(1.9);
  });

  it("AC4 a fire on the ocean counts as a fire and adds no land and no region", async () => {
    const s = setup();
    await s.add({ at: ATLANTIC });
    const { data } = (await s.get()).json;
    expect(data.fires).toHaveLength(1);
    expect(data.world.fires).toBe(1);
    expect(data.world.regionsWithFire).toBe(0);
    expect(data.world.landPercent).toBe(0);
    expect(data.us.fires).toBe(0);
  });

  it("AC5 regions are found from the coordinates, and a state counts toward its country", async () => {
    const s = setup();
    const e = await s.add({ at: NASHVILLE });
    const { data } = (await s.get()).json;
    expect(data.us.regions).toEqual([{ name: "Tennessee", events: [{ id: e.id, title: e.title }] }]);
    expect(data.world.regions.map((r: { name: string }) => r.name)).toEqual(["United States of America"]);
  });

  it("with no fires it reports zeros and no regions", async () => {
    const { data } = (await setup().get()).json;
    expect(data.fires).toEqual([]);
    expect(data.world).toMatchObject({ fires: 0, regionsWithFire: 0, landPercent: 0, regions: [] });
    expect(data.us).toMatchObject({ fires: 0, regionsWithFire: 0, landPercent: 0, regions: [] });
  });
});
