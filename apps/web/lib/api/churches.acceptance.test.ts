import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { createFakeChurchesRepo } from "../../db/churches.fake";
import { createAdminDirectory } from "../auth/admin";
import { createChurchesService } from "../services/churches";
import { notFound } from "../services/errors";
import type { Geocoder } from "../services/events";
import { createApiRoute } from "./handler";
import { churchRoutes } from "./churches";

// Executable acceptance criteria for S18 Find a Church (docs/features/s18-find-a-church.md), verified at the API
// boundary: real Request -> adapter -> authentication -> validation -> real service -> repo -> Response. Identity, the
// clock, the church list and the address lookup are the only faked boundaries.
//
// AC1  Only an approved manager (or an admin) saves; services are validated.  AC2 Saving replaces the list atomically
// and is audited.  AC3 The church shows its services in order.  AC4 The public search by place or by name, nearest first,
// paged.  AC5 Each result carries its next services.  AC6 A church that is not approved never appears.  AC7 Churches
// outside the United States work.
type Json = { ok: boolean; data: any; error?: { code: string; message: string; fieldErrors?: Record<string, string[]> } }; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("S18 find a church acceptance criteria (API boundary)", () => {
  const base = "http://localhost/api/v1";
  const admin = `user_${"A".repeat(10)}`;
  // 2026-10-11 15:00 UTC is Sunday 10:00 in Chicago.
  const clock = new Date("2026-10-11T15:00:00Z");

  const setup = (geocoder?: Geocoder) => {
    const status = new Map<string, { name: string; status: string }>();
    const managers = new Set<string>();
    const repo = createFakeChurchesRepo(() => clock, (id) => status.get(id));
    const service = createChurchesService({
      repo,
      getPublicOrganization: async (id) => {
        const org = status.get(id);
        if (!org || org.status !== "approved") throw notFound();
        return { id, name: org.name, description: `About ${org.name}`, links: ["https://church.example"] };
      },
      isManager: async (orgId, userId) => managers.has(`${orgId}:${userId}`),
      admins: createAdminDirectory([admin]),
      requireAccepted: async () => {},
      geocoder,
      now: () => clock,
    });
    const church = (name: string, approved = true) => {
      const id = randomUUID();
      status.set(id, { name, status: approved ? "approved" : "pending" });
      return id;
    };
    const user = (orgId?: string) => {
      const id = `user_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      if (orgId) managers.add(`${orgId}:${id}`);
      return id;
    };
    const as = (userId: string | null) => {
      const routes = churchRoutes(createApiRoute({ getUserId: async () => userId, onUnexpected: vi.fn() }), () => service);
      const call = async (pending: Promise<Response>) => {
        const res = await pending;
        return { status: res.status, json: (await res.json()) as Json };
      };
      const req = (url: string, method: string, body?: unknown) => new Request(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });
      const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) });
      return {
        search: (query = "") => call(routes.search.GET(req(`${base}/churches${query}`, "GET"))),
        get: (id: string) => call(routes.church.GET(req(`${base}/churches/${id}`, "GET"), ctx({ id }))),
        saveProfile: (id: string, body: unknown) => call(routes.profile.PUT(req(`${base}/organizations/${id}/profile`, "PUT", body), ctx({ id }))),
        saveServices: (id: string, body: unknown) => call(routes.services.PUT(req(`${base}/organizations/${id}/services`, "PUT", body), ctx({ id }))),
      };
    };
    return { repo, church, user, as, status, managers };
  };

  const profile = (over: Record<string, unknown> = {}) => ({ street: "1 Main St", city: "Springfield", state: "MO", zip: "65801", timeZone: "America/Chicago", location: { lat: 37.2, lng: -93.3 }, ...over });
  const svc = (weekday: number, startTime: string, label = "Worship", note = "") => ({ weekday, startTime, label, note });
  const names = (r: { json: Json }) => r.json.data.items.map((i: { name: string }) => i.name);

  it("signed-out callers get 401 on saving, and the public reads need no sign-in", async () => {
    const s = setup();
    const id = s.church("Grace Church");
    const api = s.as(null);
    expect((await api.saveProfile(id, profile())).status).toBe(401);
    expect((await api.saveServices(id, { services: [] })).status).toBe(401);
    expect((await api.search()).status).toBe(200);
    expect((await api.get(id)).status).toBe(200);
  });

  it("AC1 only an approved manager of the church (or an admin) saves; anyone else is told 'not found'", async () => {
    const s = setup();
    const id = s.church("Grace Church");
    const other = s.church("Other Church");
    const manager = s.user(id);
    const outsider = s.user(other);
    expect((await s.as(manager).saveProfile(id, profile())).status).toBe(200);
    expect((await s.as(manager).saveServices(id, { services: [svc(0, "10:00")] })).status).toBe(200);
    for (const who of [outsider, s.user()]) {
      expect((await s.as(who).saveProfile(id, profile())).status).toBe(404);
      expect((await s.as(who).saveServices(id, { services: [svc(0, "10:00")] })).status).toBe(404);
    }
    expect((await s.as(admin).saveProfile(id, profile({ city: "Joplin" }))).status).toBe(200);
    s.managers.delete(`${id}:${manager}`); // revoked at once
    expect((await s.as(manager).saveServices(id, { services: [] })).status).toBe(404);
  });

  it("AC1 each bad service is refused with a message on the field, and so are too many and the same one twice", async () => {
    const s = setup();
    const id = s.church("Grace Church");
    const api = s.as(s.user(id));
    for (const bad of [svc(7, "10:00"), svc(-1, "10:00"), svc(0, "25:99"), svc(0, "9:00"), svc(0, "10:00", ""), svc(0, "10:00", "x".repeat(61)), svc(0, "10:00", "ok", "n".repeat(201)), svc(0, "10:00", "bad\u0000label")]) {
      const r = await api.saveServices(id, { services: [bad] });
      expect(r.status, JSON.stringify(bad)).toBe(400);
      expect(r.json.error?.code).toBe("validation_failed");
    }
    const twentyOne = Array.from({ length: 21 }, (_, i) => svc(i % 7, `${String(6 + (i % 12)).padStart(2, "0")}:00`, `Service ${i}`));
    expect((await api.saveServices(id, { services: twentyOne })).status).toBe(400);
    expect((await api.saveServices(id, { services: twentyOne.slice(0, 20) })).status).toBe(200);
    expect((await api.saveServices(id, { services: [svc(0, "10:00"), svc(0, "10:00")] })).status).toBe(400);
    expect((await api.saveServices(id, { services: [svc(0, "10:00")], extra: 1 })).status).toBe(400);
  });

  it("AC1 a US church needs a state and ZIP; elsewhere neither; a bad pin or time zone is refused", async () => {
    const s = setup();
    const id = s.church("Grace Church");
    const api = s.as(s.user(id));
    const noState = await api.saveProfile(id, profile({ state: "" }));
    expect(noState.status).toBe(400);
    expect(noState.json.error?.fieldErrors?.state).toBeDefined();
    expect((await api.saveProfile(id, profile({ zip: "" }))).json.error?.fieldErrors?.zip).toBeDefined();
    expect((await api.saveProfile(id, profile({ location: { lat: 91, lng: 0 } }))).status).toBe(400);
    expect((await api.saveProfile(id, profile({ timeZone: "Mars/Olympus" }))).status).toBe(400);
    expect((await api.saveProfile(id, profile({ country: "KE", state: "", zip: "", region: "Nairobi County", city: "Kibera", timeZone: "Africa/Nairobi" }))).status).toBe(200);
  });

  it("AC2 saving replaces the whole list in order, is audited with the actor and the church, and a failed save changes nothing", async () => {
    const s = setup();
    const id = s.church("Grace Church");
    const user = s.user(id);
    const api = s.as(user);
    await api.saveServices(id, { services: [svc(3, "19:00", "Prayer"), svc(0, "10:00", "Worship")] });
    expect((await api.get(id)).json.data.services.map((x: { label: string }) => x.label)).toEqual(["Worship", "Prayer"]); // Sunday first
    s.repo.failNextSave();
    const failed = await api.saveServices(id, { services: [svc(5, "20:00", "Youth")] });
    expect(failed.status).toBe(500);
    expect((await api.get(id)).json.data.services.map((x: { label: string }) => x.label)).toEqual(["Worship", "Prayer"]); // unchanged
    await api.saveServices(id, { services: [] });
    expect((await api.get(id)).json.data.services).toEqual([]); // a church may clear its list
    expect(s.repo.audit.map((a) => a.action)).toEqual(["church.services.save", "church.services.save"]);
    expect(s.repo.audit.every((a) => a.actorId === user && a.subject === `organization:${id}`)).toBe(true);
  });

  it("AC3 the church shows its address, pin and services; with none it says so with empty data", async () => {
    const s = setup();
    const id = s.church("Grace Church");
    const empty = await s.as(null).get(id);
    expect(empty.json.data).toMatchObject({ id, name: "Grace Church", profile: null, services: [] });
    const api = s.as(s.user(id));
    await api.saveProfile(id, profile());
    await api.saveServices(id, { services: [svc(3, "19:00", "Wednesday prayer", "Childcare provided"), svc(0, "18:00", "Evening"), svc(0, "10:00", "Morning")] });
    const shown = (await s.as(null).get(id)).json.data;
    expect(shown.profile).toMatchObject({ city: "Springfield", state: "MO", country: "US", timeZone: "America/Chicago", location: { lat: 37.2, lng: -93.3 } });
    expect(shown.services.map((x: { startTime: string }) => x.startTime)).toEqual(["10:00", "18:00", "19:00"]);
    expect(shown.services[2].note).toBe("Childcare provided");
    expect(JSON.stringify(shown)).not.toMatch(/user_|managers|contactEmail/);
  });

  it("AC4 searching by position lists churches with a pin, nearest first, with their distance, and honors the radius", async () => {
    const s = setup();
    const near = s.church("Near Church");
    const mid = s.church("Mid Church");
    const far = s.church("Far Church");
    const nopin = s.church("No Pin Church");
    for (const [id, lat, lng] of [[near, 37.21, -93.3], [mid, 37.4, -93.3], [far, 38.9, -93.3]] as const) await s.as(s.user(id)).saveProfile(id, profile({ location: { lat, lng } }));
    await s.as(s.user(nopin)).saveProfile(nopin, profile({ location: null, zip: "65801" }));
    const r = await s.as(null).search("?lat=37.2&lng=-93.3&radius=50");
    expect(r.status).toBe(200);
    expect(names(r)).toEqual(["Near Church", "Mid Church"]); // far is 100+ miles away; no pin cannot be placed by distance
    expect(r.json.data.items[0].distanceMiles).toBeLessThan(2);
    expect(r.json.data.items[1].distanceMiles).toBeGreaterThan(r.json.data.items[0].distanceMiles);
    expect(names(await s.as(null).search("?lat=37.2&lng=-93.3&radius=500"))).toEqual(["Near Church", "Mid Church", "Far Church"]);
    expect((await s.as(null).search("?lat=37.2")).status).toBe(400); // both or neither
  });

  it("AC4 searching by name or city matches words in either, ignores case, includes a church without a pin, and takes no wildcards", async () => {
    const s = setup();
    const a = s.church("Grace Fellowship");
    const b = s.church("River Church");
    const c = s.church("Percent 100% Church");
    await s.as(s.user(a)).saveProfile(a, profile({ city: "Springfield" }));
    await s.as(s.user(b)).saveProfile(b, profile({ city: "Nixa", location: null }));
    await s.as(s.user(c)).saveProfile(c, profile({ city: "Ozark" }));
    expect(names(await s.as(null).search("?q=grace"))).toEqual(["Grace Fellowship"]);
    expect(names(await s.as(null).search("?q=NIXA"))).toEqual(["River Church"]); // by city; no pin is fine for a text search
    expect(names(await s.as(null).search("?q=river%20nixa"))).toEqual(["River Church"]);
    expect(names(await s.as(null).search("?q=zzz"))).toEqual([]);
    expect(names(await s.as(null).search("?"))).toEqual(["Grace Fellowship", "Percent 100% Church", "River Church"]); // by name
    expect(names(await s.as(null).search("?q=%25"))).toEqual(["Percent 100% Church"]); // a typed % matches only a % in a name; it is not a wildcard for everything
  });

  it("AC4 paging returns each church once, in order, with no gaps, and a bad cursor is refused", async () => {
    const s = setup();
    const ids = Array.from({ length: 5 }, (_, i) => s.church(`Church ${i}`));
    for (const [i, id] of ids.entries()) await s.as(s.user(id)).saveProfile(id, profile({ location: { lat: 37.2 + i * 0.05, lng: -93.3 } }));
    const seen: string[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 6; page++) {
      const r = await s.as(null).search(`?lat=37.2&lng=-93.3&radius=100&limit=2${cursor ? `&cursor=${cursor}` : ""}`);
      seen.push(...names(r));
      cursor = r.json.data.nextCursor;
      if (!cursor) break;
    }
    expect(seen).toEqual(["Church 0", "Church 1", "Church 2", "Church 3", "Church 4"]);
    expect((await s.as(null).search("?cursor=garbage")).status).toBe(400);
    expect((await s.as(null).search("?limit=500")).status).toBe(400);
    expect((await s.as(null).search("?radius=100000")).status).toBe(400);
  });

  it("AC5 each result carries its next services (up to 3) from now, in the church's own time zone, and no personal data", async () => {
    const s = setup();
    const id = s.church("Grace Church");
    const api = s.as(s.user(id));
    await api.saveProfile(id, profile());
    await api.saveServices(id, { services: [svc(0, "10:00", "Morning"), svc(0, "18:00", "Evening"), svc(3, "19:00", "Prayer"), svc(6, "09:00", "Saturday")] });
    const r = await s.as(null).search("?q=grace");
    const item = r.json.data.items[0];
    // Sunday 10:00 in Chicago right now: this service counts, then evening, then Wednesday.
    expect(item.nextServices.map((x: { label: string }) => x.label)).toEqual(["Morning", "Evening", "Prayer"]);
    expect(item.serviceCount).toBe(4);
    expect(item).toMatchObject({ city: "Springfield", state: "MO", country: "US" });
    expect(JSON.stringify(item)).not.toMatch(/user_|@/);
    const noServices = s.church("Quiet Church");
    await s.as(s.user(noServices)).saveProfile(noServices, profile());
    expect((await s.as(null).search("?q=quiet")).json.data.items[0]).toMatchObject({ nextServices: [], serviceCount: 0 });
  });

  it("AC6 a church that is not approved never appears in the search or by id, even with a full profile", async () => {
    const s = setup();
    const hidden = s.church("Hidden Church", false);
    await s.as(admin).saveProfile(hidden, profile());
    await s.as(admin).saveServices(hidden, { services: [svc(0, "10:00")] });
    expect(names(await s.as(null).search("?q=hidden"))).toEqual([]);
    expect(names(await s.as(null).search("?lat=37.2&lng=-93.3&radius=100"))).toEqual([]);
    expect((await s.as(null).get(hidden)).status).toBe(404);
    expect((await s.as(null).get("not-a-uuid")).status).toBe(404);
    s.status.set(hidden, { name: "Hidden Church", status: "approved" }); // approved later: it appears
    expect(names(await s.as(null).search("?q=hidden"))).toEqual(["Hidden Church"]);
    s.status.set(hidden, { name: "Hidden Church", status: "unpublished" }); // unpublished again: gone
    expect(names(await s.as(null).search("?q=hidden"))).toEqual([]);
  });

  it("AC7 a church outside the United States is saved, shows its region and country, and is found by distance", async () => {
    const s = setup();
    const id = s.church("Kibera Fellowship");
    const api = s.as(s.user(id));
    const saved = await api.saveProfile(id, { country: "KE", city: "Kibera", region: "Nairobi County", timeZone: "Africa/Nairobi", location: { lat: -1.3133, lng: 36.7881 } });
    expect(saved.status, JSON.stringify(saved.json)).toBe(200);
    expect(saved.json.data).toMatchObject({ country: "KE", state: "Nairobi County", city: "Kibera", zip: "" });
    const r = await s.as(null).search("?lat=-1.2921&lng=36.8219&radius=25"); // central Nairobi
    expect(r.json.data.items[0]).toMatchObject({ name: "Kibera Fellowship", country: "KE" });
    expect(r.json.data.items[0].distanceMiles).toBeGreaterThan(1);
    expect(r.json.data.items[0].distanceMiles).toBeLessThan(10);
  });

  it("a United States church with no pin is placed by its ZIP area, and one elsewhere is not placed by the US lookup", async () => {
    const geocode = vi.fn(async () => ({ lat: 37.21, lng: -93.29 }));
    const s = setup({ geocode });
    const us = s.church("Zip Church");
    await s.as(s.user(us)).saveProfile(us, profile({ location: undefined }));
    expect((await s.as(null).get(us)).json.data.profile.location).toEqual({ lat: 37.21, lng: -93.29 });
    expect(names(await s.as(null).search("?lat=37.2&lng=-93.3&radius=10"))).toEqual(["Zip Church"]);
    const abroad = s.church("Berlin Church");
    await s.as(s.user(abroad)).saveProfile(abroad, { country: "DE", city: "Berlin", region: "Berlin", zip: "12345", timeZone: "Europe/Berlin" }); // 12345 is also a US ZIP
    expect((await s.as(null).get(abroad)).json.data.profile.location).toBeNull();
    expect(geocode).toHaveBeenCalledTimes(1);
  });

  it("a pin placed by the manager is kept when the address is unchanged, replaced when sent, and removed with null", async () => {
    const geocode = vi.fn(async () => ({ lat: 1, lng: 1 }));
    const s = setup({ geocode });
    const id = s.church("Grace Church");
    const api = s.as(s.user(id));
    await api.saveProfile(id, profile({ location: { lat: 37.25, lng: -93.25 } }));
    await api.saveProfile(id, profile({ location: undefined })); // same address, no pin sent: keep the exact pin
    expect((await s.as(null).get(id)).json.data.profile.location).toEqual({ lat: 37.25, lng: -93.25 });
    expect(geocode).not.toHaveBeenCalled();
    await api.saveProfile(id, profile({ location: { lat: 37.3, lng: -93.4 } }));
    expect((await s.as(null).get(id)).json.data.profile.location).toEqual({ lat: 37.3, lng: -93.4 });
    await api.saveProfile(id, profile({ location: null }));
    expect((await s.as(null).get(id)).json.data.profile.location).toBeNull();
    expect(names(await s.as(null).search("?lat=37.2&lng=-93.3&radius=100"))).toEqual([]); // no pin: not found by distance
    expect(names(await s.as(null).search("?q=grace"))).toEqual(["Grace Church"]); // but found by name
  });
});
