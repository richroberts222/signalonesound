import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CURRENT_POLICY_VERSION, MAX_INVITES_PER_DAY, MAX_SAVED_EVENTS } from "@signalone/validation";

import { createFakeEventsRepo } from "../../db/events.fake";
import type { NewEvent } from "../../db/events";
import { createFakeMemberRepo } from "../../db/member.fake";
import { createFakeSavedRepo } from "../../db/saved.fake";
import { isJobRequestAuthorized } from "../auth/job-secret";
import { createMemberService } from "../services/member";
import { createSavedService } from "../services/saved";
import { createApiRoute } from "./handler";
import { jobRoutes, savedRoutes } from "./saved";

// Executable acceptance criteria for S6 (docs/features/s6-saved-events-and-invites.md), verified at
// the API boundary: real Request -> adapter -> authentication -> validation -> real service -> repo.
//
// AC1  A member saves and removes events and reads their list.  AC2 Saving twice is saving once.
// AC3  Only the owner reads or changes a list, and nothing reveals who saved an event.
// AC5  Saved events are removed 30 days after the event ended (the scheduled job).
// AC6  Deleting an account removes the list and the invites (see the member tables guard).
// AC7  An invite is a random 192-bit link whose hash is stored; arrivals are only counted; it expires.
// AC8  The list and the invites are limited.  AC10 Only public events can be saved; later changes are shown.
type Json = { ok: boolean; data: any; error?: { code: string } }; // eslint-disable-line @typescript-eslint/no-explicit-any
const DAY = 24 * 3600 * 1000;

describe("S6 saved events and invites acceptance criteria (API boundary)", () => {
  const base = "http://localhost/api/v1";
  const org = randomUUID();

  const setup = () => {
    let clock = new Date("2026-10-09T12:00:00Z");
    const now = () => clock;
    const events = createFakeEventsRepo(now);
    const memberRepo = createFakeMemberRepo();
    const member = createMemberService({ repo: memberRepo, identity: { deleteUser: async () => {} } });
    const repo = createFakeSavedRepo((id) => {
      const e = events.all().find((x) => x.id === id);
      return e ? { startsAt: e.startsAt, endsAt: e.endsAt } : undefined;
    }, now);
    const service = createSavedService({ repo, events, requireAccepted: (u) => member.requireAccepted(u), now });
    const newUser = async () => {
      const id = `user_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      await memberRepo.ensureProfile(id);
      await memberRepo.recordAcceptances(id, [
        { policyKind: "terms", version: CURRENT_POLICY_VERSION },
        { policyKind: "privacy", version: CURRENT_POLICY_VERSION },
      ]);
      return id;
    };
    const as = (userId: string | null) => {
      const routes = savedRoutes(createApiRoute({ getUserId: async () => userId, onUnexpected: vi.fn() }), () => service);
      const call = async (pending: Promise<Response>) => {
        const res = await pending;
        return { status: res.status, json: (await res.json()) as Json };
      };
      const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) });
      return {
        isSaved: (eventId: string) => call(routes.saved.GET(new Request(`${base}/me/saved-events/${eventId}`), ctx({ eventId }))),
        save: (eventId: string) => call(routes.saved.PUT(new Request(`${base}/me/saved-events/${eventId}`, { method: "PUT" }), ctx({ eventId }))),
        unsave: (eventId: string) => call(routes.saved.DELETE(new Request(`${base}/me/saved-events/${eventId}`, { method: "DELETE" }), ctx({ eventId }))),
        list: (query = "") => call(routes.list.GET(new Request(`${base}/me/saved-events${query}`))),
        invite: () => call(routes.invites.POST(new Request(`${base}/me/invites`, { method: "POST" }))),
        arrive: (token: string) => call(routes.arrival.POST(new Request(`${base}/invites/${token}/arrival`, { method: "POST" }), ctx({ token }))),
      };
    };
    let n = 0;
    const addEvent = async (over: Partial<NewEvent> = {}) => {
      const e: NewEvent = {
        id: randomUUID(), orgId: org, seriesId: null, title: `Event ${++n}`, description: "", status: "published",
        startsAt: new Date(clock.getTime() + (n + 1) * DAY), endsAt: null, timeZone: "America/Chicago", venueName: `Venue ${n}`,
        street: "1 St", city: "Nashville", state: "TN", zip: "37201", lat: null, lng: null, speakers: null, directions: null,
        revivalTypes: ["worship-nights"], links: [], ...over,
      };
      await events.createMany({ series: null, events: [e], userId: "u", idempotencyKey: randomUUID(), audit: { actorId: "u", action: "x", subject: "x" } });
      return e;
    };
    return { as, newUser, addEvent, events, repo, service, advance: (ms: number) => (clock = new Date(clock.getTime() + ms)) };
  };
  const ids = (r: { json: Json }) => (r.json.data.items as { eventId: string }[]).map((i) => i.eventId);

  it("signed-out callers get 401 on every member endpoint; the arrival endpoint is public", async () => {
    const s = setup();
    const api = s.as(null);
    const id = randomUUID();
    for (const r of [await api.isSaved(id), await api.save(id), await api.unsave(id), await api.list(), await api.invite()]) expect(r.status).toBe(401);
    expect((await api.arrive("A".repeat(32))).status).toBe(200);
  });

  it("AC1/AC2 a member saves, lists and removes events; saving twice is once; removing something unsaved is fine", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    const a = await s.addEvent();
    const b = await s.addEvent();
    expect((await api.isSaved(b.id)).json.data.saved).toBe(false);
    expect((await api.save(b.id)).json.data).toEqual({ eventId: b.id, saved: true });
    expect((await api.isSaved(b.id)).json.data.saved).toBe(true);
    expect((await api.save(a.id)).status).toBe(200);
    expect((await api.save(a.id)).status).toBe(200);
    expect(ids(await api.list())).toEqual([a.id, b.id]); // soonest first
    expect((await api.unsave(a.id)).json.data).toEqual({ eventId: a.id, saved: false });
    expect((await api.unsave(a.id)).status).toBe(200);
    expect(ids(await api.list())).toEqual([b.id]);
  });

  it("AC3 each member sees only their own list, and the response never carries another person's id", async () => {
    const s = setup();
    const aliceId = await s.newUser();
    const alice = s.as(aliceId);
    const bob = s.as(await s.newUser());
    const e = await s.addEvent();
    await alice.save(e.id);
    expect(ids(await bob.list())).toEqual([]);
    const mine = await alice.list();
    expect(JSON.stringify(mine.json)).not.toContain(aliceId);
    expect(Object.keys(mine.json.data.items[0]).sort()).toEqual(["event", "eventId", "savedAt", "state"]);
    await bob.unsave(e.id); // bob removing "his" copy never touches alice's
    expect(ids(await alice.list())).toEqual([e.id]);
  });

  it("AC10 only public events can be saved: drafts, deleted events and unknown ids are 'not found'", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    const draft = await s.addEvent({ status: "draft" });
    const gone = await s.addEvent();
    await s.events.setStatus({ id: gone.id, from: ["published"], to: "deleted", audit: { actorId: "u", action: "x", subject: "x" } });
    for (const id of [draft.id, gone.id, randomUUID()]) expect((await api.save(id)).status, id).toBe(404);
    expect((await api.save("not-a-uuid")).status).toBe(404);
  });

  it("AC10 an event cancelled, deleted or held after saving stays in the list, shown for what it is, with no detail for removed ones", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    const cancelled = await s.addEvent({ title: "Cancelled night" });
    const deleted = await s.addEvent({ title: "Secret deleted title" });
    const normal = await s.addEvent();
    for (const e of [cancelled, deleted, normal]) await api.save(e.id);
    await s.events.setStatus({ id: cancelled.id, from: ["published"], to: "cancelled", audit: { actorId: "u", action: "x", subject: "x" } });
    await s.events.setStatus({ id: deleted.id, from: ["published"], to: "deleted", audit: { actorId: "u", action: "x", subject: "x" } });
    const items = (await api.list()).json.data.items as { eventId: string; state: string; event: { title: string } | null }[];
    expect(items.find((i) => i.eventId === cancelled.id)).toMatchObject({ state: "cancelled", event: { title: "Cancelled night" } });
    expect(items.find((i) => i.eventId === deleted.id)).toMatchObject({ state: "removed", event: null });
    expect(JSON.stringify(items)).not.toContain("Secret deleted title");
    expect(items.find((i) => i.eventId === normal.id)?.state).toBe("upcoming");
  });

  it("past events follow the upcoming ones, and paging returns each saved event once", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    const made = [];
    for (let i = 0; i < 5; i++) made.push(await s.addEvent());
    for (const e of made) await api.save(e.id);
    s.advance(3.5 * DAY); // the first events are now in the past
    const seen: string[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < 6; page++) {
      const r: { json: Json } = await api.list(`?limit=2${cursor ? `&cursor=${cursor}` : ""}`);
      seen.push(...ids(r));
      cursor = r.json.data.nextCursor;
      if (!cursor) break;
    }
    const upcomingFirst = [...made.filter((e) => e.startsAt > new Date("2026-10-12T24:00:00Z")), ...made.filter((e) => e.startsAt <= new Date("2026-10-12T24:00:00Z"))].map((e) => e.id);
    expect(new Set(seen).size).toBe(5);
    expect(seen.slice(0, 3).every((id) => upcomingFirst.slice(0, 3).includes(id))).toBe(true);
    expect((await api.list("?cursor=garbage")).status).toBe(400);
  });

  it("AC8 the list is limited", async () => {
    const s = setup();
    const userId = await s.newUser();
    const api = s.as(userId);
    for (let i = 0; i < MAX_SAVED_EVENTS; i++) await s.repo.save(userId, randomUUID());
    const e = await s.addEvent();
    const r = await api.save(e.id);
    expect(r.status).toBe(409);
  });

  it("claims need the current policy accepted", async () => {
    const s = setup();
    const e = await s.addEvent();
    const stranger = `user_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    expect((await s.as(stranger).save(e.id)).json.error?.code).toBe("policy_reacceptance_required");
    expect((await s.as(stranger).invite()).json.error?.code).toBe("policy_reacceptance_required");
  });

  it("AC5 the retention job removes saved events 30 days after the event ended, and nothing sooner", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    const e = await s.addEvent({ startsAt: new Date(Date.parse("2026-10-10T12:00:00Z")), endsAt: new Date(Date.parse("2026-10-10T14:00:00Z")) });
    const open = await s.addEvent({ startsAt: new Date(Date.parse("2026-12-01T12:00:00Z")) });
    await api.save(e.id);
    await api.save(open.id);
    s.advance(40 * DAY); // 2026-11-18: the first ended on Oct 10, 39 days ago
    expect(await s.service.purge()).toMatchObject({ savedRemoved: 1 });
    expect(s.repo.rows().map((r) => r.eventId)).toEqual([open.id]);
    const early = setup();
    const earlyApi = early.as(await early.newUser());
    const recent = await early.addEvent({ startsAt: new Date(Date.parse("2026-10-10T12:00:00Z")), endsAt: new Date(Date.parse("2026-10-10T14:00:00Z")) });
    await earlyApi.save(recent.id);
    early.advance(25 * DAY); // only 24 days after it ended
    expect(await early.service.purge()).toMatchObject({ savedRemoved: 0 });
  });

  it("AC7 an invite is a random token, only its hash is stored, and it expires after 30 days", async () => {
    const s = setup();
    const userId = await s.newUser();
    const api = s.as(userId);
    const a = (await api.invite()).json.data;
    const b = (await api.invite()).json.data;
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{32}$/); // 24 random bytes = 192 bits
    expect(a.token).not.toBe(b.token);
    const stored = JSON.stringify(s.repo.invites());
    expect(stored).not.toContain(a.token);
    expect(stored).not.toContain(b.token);
    expect(new Date(a.expiresAt).getTime() - Date.parse("2026-10-09T12:00:00Z")).toBe(30 * DAY);
    expect((await s.as(null).arrive(a.token)).json.data).toEqual({ counted: true });
    expect((await s.as(null).arrive(a.token)).json.data).toEqual({ counted: true });
    expect(s.repo.invites()[0].arrivals).toBe(2);
    expect(Object.keys(s.repo.invites()[0]).sort()).toEqual(["arrivals", "createdAt", "createdBy", "expiresAt", "tokenHash"]); // no invitee, no address, no device
    expect((await s.as(null).arrive("Z".repeat(32))).json.data).toEqual({ counted: false }); // an unknown link counts nothing
    s.advance(31 * DAY);
    expect((await s.as(null).arrive(a.token)).json.data).toEqual({ counted: false });
    expect(await s.service.purge()).toMatchObject({ invitesRemoved: 2 });
  });

  it("AC7 a malformed token is refused", async () => {
    const s = setup();
    for (const token of ["short", "has spaces in it which is long enough", "x".repeat(100)]) expect((await s.as(null).arrive(token)).status, token).toBe(404);
  });

  it("AC8 invites are limited per member per day", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    for (let i = 0; i < MAX_INVITES_PER_DAY; i++) expect((await api.invite()).status).toBe(200);
    expect((await api.invite()).status).toBe(429);
    s.advance(25 * 3600 * 1000);
    expect((await api.invite()).status).toBe(200);
  });
});

describe("scheduled jobs are protected by the scheduler's secret", () => {
  const secret = "a-long-enough-secret-value";
  const call = async (header: string | null, configured: string | null, run = vi.fn(async () => ({ ok: true }))) => {
    const routes = jobRoutes(createApiRoute({ getUserId: async () => null, onUnexpected: vi.fn() }), {
      authorized: (r) => isJobRequestAuthorized(r, configured),
      retention: run,
    });
    const res = await routes.retention.GET(new Request("http://localhost/api/v1/internal/jobs/retention", { headers: header ? { authorization: header } : {} }));
    return { status: res.status, run };
  };

  it("runs with the right secret and with nothing else", async () => {
    const good = await call(`Bearer ${secret}`, secret);
    expect(good.status).toBe(200);
    expect(good.run).toHaveBeenCalledTimes(1);
    for (const header of [null, "", "Bearer", `Bearer ${secret}x`, `bearer ${secret}`, secret, "Bearer wrong", `Basic ${secret}`]) {
      const r = await call(header, secret);
      expect(r.status, String(header)).toBe(401);
      expect(r.run).not.toHaveBeenCalled();
    }
  });

  it("with no secret configured every call is refused", async () => {
    for (const header of [null, `Bearer ${secret}`, "Bearer undefined", "Bearer null", "Bearer "]) {
      const r = await call(header, null);
      expect(r.status, String(header)).toBe(401);
      expect(r.run).not.toHaveBeenCalled();
    }
  });

  it("the job route file reads its secret from the server configuration only", () => {
    const source = readFileSync(path.join(__dirname, "..", "..", "app", "api", "v1", "internal", "jobs", "retention", "route.ts"), "utf8");
    expect(source).toContain("getCronSecret()");
    expect(source).not.toMatch(/process\.env/);
  });
});
