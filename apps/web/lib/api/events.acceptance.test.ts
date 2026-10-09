import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { CURRENT_POLICY_VERSION } from "@signalone/validation";

import { createFakeEventsRepo } from "../../db/events.fake";
import { createFakeMemberRepo } from "../../db/member.fake";
import { createAdminDirectory } from "../auth/admin";
import { createEventsService, type Geocoder } from "../services/events";
import { createMemberService } from "../services/member";
import { createApiRoute } from "./handler";
import { eventRoutes } from "./events";

// Executable acceptance criteria for S3 (docs/features/s3-events-church-portal.md), verified at the
// API boundary: real Request -> adapter -> authentication -> validation -> real service -> repo ->
// Response. Identity, the clock and the geocoder are the only faked boundaries.
//
// AC1  Only an approved manager (or an admin) of the organization manages its events.
// AC2  Required fields each give a specific message.
// AC3  Times are stored as an exact moment plus the zone; local time is right across daylight saving.
// AC4  End after start; start in the future and within two years; past events cannot be edited.
// AC5  Series expand correctly; "this" edits make an exception, "series" edits change future ones.
// AC6  State, ZIP and links are validated.  AC7  Title and description are plain text.
// AC8  A duplicate at the same venue and time needs a reason.  AC9  Past and cancelled handling.
// AC10 Every change is audited.  AC11 A revoked manager is locked out at once.
// AC13 Managers can read any state; stale edits conflict; a repeated create returns the first result.
type Json = { ok: boolean; data: Record<string, any>; error?: { code: string; fieldErrors?: Record<string, string[]> } }; // eslint-disable-line @typescript-eslint/no-explicit-any

describe("S3 events acceptance criteria (API boundary)", () => {
  const unexpected = vi.fn();
  const base = "http://localhost/api/v1";
  const admin = `user_${"A".repeat(10)}`;
  const org = randomUUID();
  const otherOrg = randomUUID();

  const setup = (geocoder?: Geocoder) => {
    let clock = new Date("2026-10-09T12:00:00Z");
    const now = () => clock;
    const repo = createFakeEventsRepo(now);
    const managers = new Set<string>();
    const memberRepo = createFakeMemberRepo();
    const member = createMemberService({ repo: memberRepo, identity: { deleteUser: async () => {} } });
    const service = createEventsService({
      repo,
      isManager: async (orgId, userId) => managers.has(`${orgId}:${userId}`),
      admins: createAdminDirectory([admin]),
      requireAccepted: (userId) => member.requireAccepted(userId),
      geocoder,
      now,
    });
    const newUser = async (orgIds: string[] = [org]) => {
      const id = `user_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      await memberRepo.ensureProfile(id);
      await memberRepo.recordAcceptances(id, [
        { policyKind: "terms", version: CURRENT_POLICY_VERSION },
        { policyKind: "privacy", version: CURRENT_POLICY_VERSION },
      ]);
      for (const o of orgIds) managers.add(`${o}:${id}`);
      return id;
    };
    const as = (userId: string | null) => {
      const routes = eventRoutes(createApiRoute({ getUserId: async () => userId, onUnexpected: unexpected }), () => service);
      const call = async (pending: Promise<Response>) => {
        const res = await pending;
        return { status: res.status, json: (await res.json()) as Json };
      };
      const req = (url: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
        new Request(url, { method, body: body === undefined ? undefined : JSON.stringify(body), headers });
      const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) });
      return {
        create: (orgId: string, body: unknown, key: string | null = randomUUID()) =>
          call(routes.orgEvents.POST(req(`${base}/organizations/${orgId}/events`, "POST", body, key ? { "Idempotency-Key": key } : {}), ctx({ id: orgId }))),
        list: (orgId: string, query = "") => call(routes.orgEvents.GET(req(`${base}/organizations/${orgId}/events${query}`, "GET"), ctx({ id: orgId }))),
        get: (id: string) => call(routes.event.GET(req(`${base}/events/${id}`, "GET"), ctx({ id }))),
        patch: (id: string, body: unknown) => call(routes.event.PATCH(req(`${base}/events/${id}`, "PATCH", body), ctx({ id }))),
        remove: (id: string) => call(routes.event.DELETE(req(`${base}/events/${id}`, "DELETE"), ctx({ id }))),
        publish: (id: string) => call(routes.publish.POST(req(`${base}/events/${id}/publish`, "POST"), ctx({ id }))),
        cancel: (id: string) => call(routes.cancel.POST(req(`${base}/events/${id}/cancel`, "POST"), ctx({ id }))),
      };
    };
    return { repo, as, newUser, managers, advance: (ms: number) => (clock = new Date(clock.getTime() + ms)) };
  };

  const body = (over: Record<string, unknown> = {}) => ({
    title: "Sample Revival Night",
    description: "A sample event.",
    startLocal: "2026-10-14T19:00",
    endLocal: "2026-10-14T21:30",
    timeZone: "America/Chicago",
    venueName: `Sample Venue ${randomUUID().slice(0, 6)}`,
    street: "123 Sample Street",
    city: "Nashville",
    state: "TN",
    zip: "37201",
    revivalTypes: ["tent-revivals", "worship-nights"],
    links: ["https://sample-church.example"],
    ...over,
  });
  const made = async (s: ReturnType<typeof setup>, over: Record<string, unknown> = {}) => {
    const user = await s.newUser();
    const api = s.as(user);
    const r = await api.create(org, body(over));
    expect(r.status, JSON.stringify(r.json)).toBe(200);
    return { user, api, event: r.json.data.event as Record<string, any>, result: r }; // eslint-disable-line @typescript-eslint/no-explicit-any
  };

  it("signed-out callers get 401 on every endpoint", async () => {
    const s = setup();
    const api = s.as(null);
    const id = randomUUID();
    for (const r of [await api.create(org, {}), await api.list(org), await api.get(id), await api.patch(id, {}), await api.remove(id), await api.publish(id), await api.cancel(id)]) {
      expect(r.status).toBe(401);
    }
  });

  it("AC1/AC11 only an approved manager (or an admin) manages an organization's events; a revoked manager is out at once", async () => {
    const s = setup();
    const mgr = await s.newUser();
    const outsider = await s.newUser([otherOrg]);
    const created = await s.as(mgr).create(org, body());
    const id = created.json.data.event.id;
    for (const r of [
      await s.as(outsider).create(org, body()),
      await s.as(outsider).get(id),
      await s.as(outsider).list(org),
      await s.as(outsider).patch(id, { version: 1, title: "Hijacked title" }),
      await s.as(outsider).publish(id),
      await s.as(outsider).cancel(id),
      await s.as(outsider).remove(id),
    ]) {
      expect(r.status).toBe(404); // existence is not revealed
    }
    expect((await s.as(admin).get(id)).status).toBe(200);
    expect((await s.as(mgr).get(id)).status).toBe(200);
    s.managers.delete(`${org}:${mgr}`);
    for (const r of [await s.as(mgr).get(id), await s.as(mgr).patch(id, { version: 1, title: "Still me?" }), await s.as(mgr).publish(id), await s.as(mgr).remove(id)]) {
      expect(r.status).toBe(404);
    }
  });

  it("claims need the current policy accepted", async () => {
    const s = setup();
    const id = `user_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    s.managers.add(`${org}:${id}`);
    const r = await s.as(id).create(org, body());
    expect(r.status).toBe(403);
    expect(r.json.error?.code).toBe("policy_reacceptance_required");
  });

  it("AC2 every missing required field gets its own message", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    for (const field of ["title", "startLocal", "timeZone", "venueName", "street", "city", "state", "zip", "revivalTypes"]) {
      const rest: Record<string, unknown> = { ...body() };
      delete rest[field];
      const r = await api.create(org, rest);
      expect(r.status, field).toBe(400);
      expect(r.json.error?.fieldErrors?.[field]?.length, field).toBeGreaterThan(0);
    }
    expect((await api.create(org, body({ revivalTypes: [] }))).json.error?.fieldErrors?.revivalTypes?.[0]).toBe("Choose at least one revival type");
  });

  it("AC3 the exact moment is stored with the zone, and the local time reads back as entered", async () => {
    const s = setup();
    const { event } = await made(s);
    expect(event).toMatchObject({ startsAt: "2026-10-15T00:00:00.000Z", startLocal: "2026-10-14T19:00", endsAt: "2026-10-15T02:30:00.000Z", endLocal: "2026-10-14T21:30", timeZone: "America/Chicago" });
  });

  it("AC3/AC5 a weekly series keeps 7:00 PM local time across the autumn clock change", async () => {
    const s = setup();
    const { result } = await made(s, { startLocal: "2026-10-28T19:00", endLocal: "2026-10-28T21:00", recurrence: { kind: "weekly", until: "2026-11-18" }, publish: true });
    expect(result.json.data.occurrences).toBe(4);
    const listed = (await s.as(admin).list(org, "?limit=50")).json.data.items;
    const rows = listed.filter((e: any) => e.seriesId === result.json.data.event.seriesId); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(rows.map((e: any) => e.startLocal)).toEqual(["2026-10-28T19:00", "2026-11-04T19:00", "2026-11-11T19:00", "2026-11-18T19:00"]); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(rows.map((e: any) => e.startsAt)).toEqual(["2026-10-29T00:00:00.000Z", "2026-11-05T01:00:00.000Z", "2026-11-12T01:00:00.000Z", "2026-11-19T01:00:00.000Z"]); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(rows[1].endLocal).toBe("2026-11-04T21:00");
  });

  it("AC4 end must follow start; the start must be in the future and within two years", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    expect((await api.create(org, body({ endLocal: "2026-10-14T19:00" }))).json.error?.fieldErrors?.endLocal).toBeTruthy();
    expect((await api.create(org, body({ endLocal: "2026-10-14T18:00" }))).status).toBe(400);
    expect((await api.create(org, body({ startLocal: "2026-10-08T19:00", endLocal: undefined }))).json.error?.fieldErrors?.startLocal).toBeTruthy();
    expect((await api.create(org, body({ startLocal: "2028-12-01T19:00", endLocal: undefined }))).status).toBe(400);
    expect((await api.create(org, body({ startLocal: "2026-02-30T19:00", endLocal: undefined }))).status).toBe(400);
    expect((await api.create(org, body({ timeZone: "Mars/Olympus" }))).status).toBe(400);
  });

  it("AC4 a past event cannot be edited or published, but it can be deleted", async () => {
    const s = setup();
    const { api, event } = await made(s);
    s.advance(10 * 24 * 3600 * 1000);
    expect((await api.patch(event.id, { version: event.version, title: "Too late" })).status).toBe(409);
    expect((await api.publish(event.id)).status).toBe(409);
    expect((await api.remove(event.id)).status).toBe(200);
  });

  it("AC5 editing 'this' occurrence makes an exception; editing the 'series' changes the other future ones", async () => {
    const s = setup();
    const { api, result } = await made(s, { recurrence: { kind: "weekly", until: "2026-11-04" }, publish: true });
    const ids = (await api.list(org, "?limit=50")).json.data.items.map((e: any) => e.id) as string[]; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(ids).toHaveLength(4);
    const [first, second, third, fourth] = ids;
    const secondEvent = (await api.get(second)).json.data;
    const edited = await api.patch(second, { version: secondEvent.version, scope: "this", title: "Special night" });
    expect(edited.json.data).toMatchObject({ title: "Special night", isException: true });
    expect((await api.get(third)).json.data.title).toBe("Sample Revival Night");

    const firstEvent = (await api.get(first)).json.data;
    const seriesEdit = await api.patch(first, { version: firstEvent.version, scope: "series", title: "Renamed series", startLocal: "2026-10-14T18:30", endLocal: "2026-10-14T20:00" });
    expect(seriesEdit.status, JSON.stringify(seriesEdit.json)).toBe(200);
    expect((await api.get(third)).json.data).toMatchObject({ title: "Renamed series", startLocal: "2026-10-28T18:30", endLocal: "2026-10-28T20:00" });
    expect((await api.get(fourth)).json.data.title).toBe("Renamed series");
    expect((await api.get(second)).json.data.title).toBe("Special night"); // the exception is left alone
    expect(result.json.data.event.seriesId).toBeTruthy();
    const single = await made(setup(), {});
    expect((await single.api.patch(single.event.id, { version: 1, scope: "series", title: "No series here" })).status).toBe(400);
  });

  it("AC6 state, ZIP and links are validated", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    for (const over of [
      { state: "XX" }, { state: "Texas" }, { state: "tn" },
      { zip: "1234" }, { zip: "123456" }, { zip: "abcde" }, { zip: "37201-12" },
      { links: ["a", "b", "c", "d"].map((x) => `https://${x}.example`) },
      { links: ["javascript:alert(1)"] }, { links: ["ftp://x.example"] },
    ]) {
      expect((await api.create(org, body(over))).status, JSON.stringify(over).slice(0, 60)).toBe(400);
    }
    expect((await api.create(org, body({ zip: "37201-1234", state: "DC", links: [] }))).status).toBe(200);
  });

  it("AC7 title and description are plain text of bounded length; markup is stored as typed", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    for (const over of [{ title: "ab" }, { title: "x".repeat(121) }, { title: "two\nlines" }, { description: "x".repeat(4001) }, { description: `bad${String.fromCharCode(0)}` }, { venueName: "" }]) {
      expect((await api.create(org, body(over))).status, JSON.stringify(over).slice(0, 50)).toBe(400);
    }
    const r = await api.create(org, body({ title: "<script>alert(1)</script>", description: "line one\nline two <b>bold</b>" }));
    expect(r.json.data.event).toMatchObject({ title: "<script>alert(1)</script>", description: "line one\nline two <b>bold</b>" });
  });

  it("AC8 an overlapping event at the same venue needs a reason, which is recorded", async () => {
    const s = setup();
    const user = await s.newUser();
    const api = s.as(user);
    const first = body();
    expect((await api.create(org, first)).status).toBe(200);
    const clash = await api.create(org, { ...first, title: "Second event", startLocal: "2026-10-14T20:00", endLocal: "2026-10-14T22:00" });
    expect(clash.status).toBe(409);
    const allowed = await api.create(org, { ...first, title: "Second event", startLocal: "2026-10-14T20:00", endLocal: "2026-10-14T22:00", duplicateOverrideReason: "two rooms" });
    expect(allowed.status).toBe(200);
    expect(s.repo.audit.some((a) => a.detail?.includes("duplicate override: two rooms"))).toBe(true);
    expect((await api.create(org, { ...first, startLocal: "2026-10-15T20:00", endLocal: "2026-10-15T22:00" })).status).toBe(200); // another day: no clash
  });

  it("AC9 past events leave the upcoming list; cancelled events stay visible as cancelled until their date passes", async () => {
    const s = setup();
    const { api, event } = await made(s, { publish: true });
    expect((await api.cancel(event.id)).json.data.status).toBe("cancelled");
    const upcoming = (await api.list(org)).json.data.items;
    expect(upcoming.map((e: any) => [e.id, e.status])).toEqual([[event.id, "cancelled"]]); // eslint-disable-line @typescript-eslint/no-explicit-any
    s.advance(10 * 24 * 3600 * 1000);
    expect((await api.list(org)).json.data.items).toHaveLength(0);
    expect((await api.list(org, "?filter=past")).json.data.items.map((e: any) => e.id)).toEqual([event.id]); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it("drafts are listed on their own, can be published, and a published event cannot be published twice", async () => {
    const s = setup();
    const { api, event } = await made(s);
    expect(event.status).toBe("draft");
    expect((await api.list(org)).json.data.items).toHaveLength(0);
    expect((await api.list(org, "?filter=drafts")).json.data.items).toHaveLength(1);
    expect((await api.publish(event.id)).json.data.status).toBe("published");
    expect((await api.publish(event.id)).status).toBe(409);
    expect((await api.cancel(randomUUID())).status).toBe(404);
  });

  it("AC10 every create, edit, publish, cancel and delete is audited with who and what", async () => {
    const s = setup();
    const { user, api, event } = await made(s);
    await api.patch(event.id, { version: 1, title: "Edited title" });
    await api.publish(event.id);
    await api.cancel(event.id);
    await api.remove(event.id);
    expect(s.repo.audit.map((a) => a.action)).toEqual(["event.create", "event.update", "event.publish", "event.cancel", "event.delete"]);
    expect(s.repo.audit.every((a) => a.actorId === user && a.subject.includes(event.id))).toBe(true);
  });

  it("AC13 managers can read a deleted event; a deleted event is not listed and cannot be edited", async () => {
    const s = setup();
    const { api, event } = await made(s, { publish: true });
    await api.remove(event.id);
    expect((await api.get(event.id)).json.data.status).toBe("deleted");
    expect((await api.list(org)).json.data.items).toHaveLength(0);
    expect((await api.patch(event.id, { version: 2, title: "Zombie" })).status).toBe(404);
  });

  it("AC13 a stale edit conflicts and changes nothing; a current one succeeds and bumps the version", async () => {
    const s = setup();
    const { api, event } = await made(s);
    const ok = await api.patch(event.id, { version: 1, title: "Edited once" });
    expect(ok.json.data).toMatchObject({ title: "Edited once", version: 2 });
    const stale = await api.patch(event.id, { version: 1, title: "Edited from an old copy" });
    expect(stale.status).toBe(409);
    expect((await api.get(event.id)).json.data.title).toBe("Edited once");
  });

  it("AC13 a repeated create with the same key returns the first event; a new key makes a new one; a missing key is refused", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    const key = randomUUID();
    const first = await api.create(org, body(), key);
    const again = await api.create(org, body(), key);
    expect(again.json.data.event.id).toBe(first.json.data.event.id);
    expect(s.repo.all()).toHaveLength(1);
    expect((await api.create(org, body({ startLocal: "2026-10-20T19:00", endLocal: "2026-10-20T21:00" }), randomUUID())).status).toBe(200);
    expect(s.repo.all()).toHaveLength(2);
    expect((await api.create(org, body(), null)).status).toBe(400);
    expect((await api.create(org, body(), "short")).status).toBe(400);
    s.advance(25 * 3600 * 1000);
    expect((await api.create(org, body({ startLocal: "2026-10-22T19:00", endLocal: undefined }), key)).status).toBe(200); // a key older than a day may be reused
  });

  it("an address is located through the geocoder; an event it cannot place is flagged and still saved", async () => {
    const found: Geocoder = { geocode: vi.fn(async () => ({ lat: 36.16, lng: -86.78 })) };
    const withCoords = await made(setup(found));
    expect(withCoords.event.hasLocation).toBe(true);
    const none = await made(setup());
    expect(none.event.hasLocation).toBe(false);
    const moved = await none.api.patch(none.event.id, { version: 1, street: "456 New Street" });
    expect(moved.json.data.hasLocation).toBe(false);
  });

  it("paging returns each event once, in order, with no gaps", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    for (let i = 0; i < 5; i++) {
      await api.create(org, body({ publish: true, startLocal: `2026-10-${String(14 + i).padStart(2, "0")}T19:00`, endLocal: undefined }));
    }
    const seen: string[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 5; page++) {
      const r = await api.list(org, `?limit=2${cursor ? `&cursor=${cursor}` : ""}`);
      seen.push(...r.json.data.items.map((e: any) => e.startLocal)); // eslint-disable-line @typescript-eslint/no-explicit-any
      cursor = r.json.data.nextCursor;
      if (!cursor) break;
    }
    expect(seen).toEqual(["2026-10-14T19:00", "2026-10-15T19:00", "2026-10-16T19:00", "2026-10-17T19:00", "2026-10-18T19:00"]);
    expect((await api.list(org, "?cursor=garbage")).status).toBe(400);
  });

  it("hostile input: unknown fields, ids and statuses cannot be set, and bad ids are 'not found'", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    for (const over of [{ id: randomUUID() }, { status: "published" }, { orgId: otherOrg }, { version: 5 }, { moderationState: "x" }, { lat: 1 }]) {
      expect((await api.create(org, body(over))).status, JSON.stringify(over)).toBe(400);
    }
    const { event } = await made(s);
    for (const bad of [{ status: "deleted" }, { id: randomUUID() }, { orgId: otherOrg }, { isException: true }]) {
      expect((await s.as(admin).patch(event.id, { version: 1, ...bad })).status, JSON.stringify(bad)).toBe(400);
    }
    expect((await api.get("not-a-uuid")).status).toBe(404);
    expect((await api.list("not-a-uuid")).status).toBe(404);
  });
});
