import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { CURRENT_POLICY_VERSION, MAX_FIRES_PER_DAY } from "@signalone/validation";

import { createFakeEventsRepo } from "../../db/events.fake";
import type { NewEvent } from "../../db/events";
import { createFakeFiresRepo } from "../../db/fires.fake";
import { createFakeMemberRepo } from "../../db/member.fake";
import { createFiresService } from "../services/fires";
import { createMemberService } from "../services/member";
import { firesRoutes } from "./fires";
import { createApiRoute } from "./handler";

// Executable acceptance criteria for S19 (docs/features/s19-fire-recommend.md), verified at the API boundary:
// real Request -> adapter -> authentication -> validation -> real service -> repo.
//
// AC1/AC2  A member gives and takes back a fire; giving twice is once; taking back an unfired one is fine.
// AC3      The member's own state answers only for the caller; nothing carries anyone's id.
// AC5      Only public events can be fired.  AC6 At most 100 new fires in 24 hours.  AC7 Fires go 30 days after the event.
type Json = { ok: boolean; data: any; error?: { code: string } }; // eslint-disable-line @typescript-eslint/no-explicit-any
const DAY = 24 * 3600 * 1000;

describe("S19 fire acceptance criteria (API boundary)", () => {
  const base = "http://localhost/api/v1";
  const org = randomUUID();

  const setup = () => {
    let clock = new Date("2026-10-11T12:00:00Z");
    const now = () => clock;
    const events = createFakeEventsRepo(now);
    const memberRepo = createFakeMemberRepo();
    const member = createMemberService({ repo: memberRepo, identity: { deleteUser: async () => {} } });
    const repo = createFakeFiresRepo((id) => {
      const e = events.all().find((x) => x.id === id);
      return e ? { startsAt: e.startsAt, endsAt: e.endsAt } : undefined;
    }, now);
    const service = createFiresService({ repo, events, requireAccepted: (u) => member.requireAccepted(u), now });
    const newUser = async (accepted = true) => {
      const id = `user_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      await memberRepo.ensureProfile(id);
      if (accepted) {
        await memberRepo.recordAcceptances(id, [
          { policyKind: "terms", version: CURRENT_POLICY_VERSION },
          { policyKind: "privacy", version: CURRENT_POLICY_VERSION },
        ]);
      }
      return id;
    };
    const as = (userId: string | null) => {
      const routes = firesRoutes(createApiRoute({ getUserId: async () => userId, onUnexpected: vi.fn() }), () => service);
      const call = async (pending: Promise<Response>) => {
        const res = await pending;
        return { status: res.status, json: (await res.json()) as Json };
      };
      const ctx = (eventId: string) => ({ params: Promise.resolve({ eventId }) });
      return {
        isFired: (eventId: string) => call(routes.fire.GET(new Request(`${base}/me/fires/${eventId}`), ctx(eventId))),
        fire: (eventId: string) => call(routes.fire.PUT(new Request(`${base}/me/fires/${eventId}`, { method: "PUT" }), ctx(eventId))),
        unfire: (eventId: string) => call(routes.fire.DELETE(new Request(`${base}/me/fires/${eventId}`, { method: "DELETE" }), ctx(eventId))),
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
    return { as, newUser, addEvent, repo, service, advance: (ms: number) => (clock = new Date(clock.getTime() + ms)) };
  };

  it("signed-out callers get 401 on every fire endpoint", async () => {
    const s = setup();
    const api = s.as(null);
    const id = randomUUID();
    for (const r of [await api.isFired(id), await api.fire(id), await api.unfire(id)]) expect(r.status).toBe(401);
  });

  it("AC1/AC2 a member gives and takes back a fire; giving twice is once; taking back an unfired one is fine", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    const e = await s.addEvent();
    expect((await api.isFired(e.id)).json.data.fired).toBe(false);
    expect((await api.fire(e.id)).json.data).toEqual({ eventId: e.id, fired: true });
    expect((await api.fire(e.id)).status).toBe(200);
    expect(s.repo.total(e.id)).toBe(1);
    expect((await api.isFired(e.id)).json.data.fired).toBe(true);
    expect((await api.unfire(e.id)).json.data).toEqual({ eventId: e.id, fired: false });
    expect((await api.unfire(e.id)).status).toBe(200);
    expect(s.repo.total(e.id)).toBe(0);
  });

  it("AC3 the answer is the caller's own, and never carries anyone's id", async () => {
    const s = setup();
    const aliceId = await s.newUser();
    const alice = s.as(aliceId);
    const bob = s.as(await s.newUser());
    const e = await s.addEvent();
    const given = await alice.fire(e.id);
    expect(Object.keys(given.json.data).sort()).toEqual(["eventId", "fired"]);
    expect(JSON.stringify(given.json)).not.toContain(aliceId);
    expect((await bob.isFired(e.id)).json.data.fired).toBe(false); // bob does not see alice's fire as his own
    await bob.unfire(e.id); // bob taking back "his" fire never touches alice's
    expect((await alice.isFired(e.id)).json.data.fired).toBe(true);
    expect(s.repo.total(e.id)).toBe(1);
  });

  it("two members each give a fire and the total is two", async () => {
    const s = setup();
    const e = await s.addEvent();
    await s.as(await s.newUser()).fire(e.id);
    await s.as(await s.newUser()).fire(e.id);
    expect(s.repo.total(e.id)).toBe(2);
  });

  it("AC5 only public events can be fired: drafts and unknown ids are 'not found'", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    const draft = await s.addEvent({ status: "draft" });
    expect((await api.fire(draft.id)).status).toBe(404);
    expect((await api.fire(randomUUID())).status).toBe(404);
    expect((await api.fire("not-a-uuid")).status).toBe(404);
    expect(s.repo.rows()).toHaveLength(0);
  });

  it("a member who has not accepted the current terms cannot fire", async () => {
    const s = setup();
    const api = s.as(await s.newUser(false));
    const e = await s.addEvent();
    const r = await api.fire(e.id);
    expect(r.status).toBe(403);
    expect(r.json.error?.code).toBe("policy_reacceptance_required");
    expect(s.repo.rows()).toHaveLength(0);
  });

  it("AC6 at most 100 new fires in 24 hours; fires again after the day passes; repeating a fire does not count", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    const list: NewEvent[] = [];
    for (let i = 0; i <= MAX_FIRES_PER_DAY; i++) list.push(await s.addEvent());
    for (let i = 0; i < MAX_FIRES_PER_DAY; i++) expect((await api.fire(list[i].id)).status).toBe(200);
    expect((await api.fire(list[0].id)).status).toBe(200); // already fired: not a new fire, never limited
    const over = await api.fire(list[MAX_FIRES_PER_DAY].id);
    expect(over.status).toBe(429);
    expect(over.json.error?.code).toBe("rate_limited");
    s.advance(DAY + 1000);
    expect((await api.fire(list[MAX_FIRES_PER_DAY].id)).status).toBe(200);
  });

  it("AC7 the retention job removes fires 30 days after the event ended, and not before", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    const e = await s.addEvent({ startsAt: new Date("2026-10-12T12:00:00Z"), endsAt: new Date("2026-10-12T14:00:00Z") });
    await api.fire(e.id);
    s.advance(25 * DAY); // 2026-11-05: the event ended 24 days ago
    expect(await s.service.purge()).toEqual({ firesRemoved: 0 });
    s.advance(10 * DAY); // 2026-11-15: ended 34 days ago
    expect(await s.service.purge()).toEqual({ firesRemoved: 1 });
    expect(s.repo.rows()).toHaveLength(0);
  });
});
