import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { CURRENT_POLICY_VERSION, MAX_ALERT_RULES } from "@signalone/validation";

import { createFakeMemberRepo } from "../../db/member.fake";
import { createFakeNotificationsRepo, emptyNotificationWorld } from "../../db/notifications.fake";
import { createUnsubscribeToken } from "../notifications/unsubscribe";
import { searchPlaces } from "../places/gazetteer";
import { createAlertsService } from "../services/alerts";
import { createMemberService } from "../services/member";
import { alertRoutes } from "./alerts";
import { createApiRoute } from "./handler";

// Executable acceptance criteria for S7's member-facing side (docs/features/s7-alerts-and-push.md), at the
// API boundary: AC1 create, edit, pause and delete alerts (at most 10); AC5 unsubscribe without signing in;
// AC7 a rounded point and no history; AC8 a revoked phone is gone; plus privacy: every read is the caller's own.
type Json = { ok: boolean; data: any; error?: { code: string; fieldErrors?: Record<string, string[]> } }; // eslint-disable-line @typescript-eslint/no-explicit-any
const secret = "a-long-enough-unsubscribe-secret-value!!";

describe("S7 alerts acceptance criteria (API boundary)", () => {
  const base = "http://localhost/api/v1";
  const org = randomUUID();

  const setup = (unsubscribeSecret: string | null = secret) => {
    const clock = new Date("2026-10-09T12:00:00Z");
    const world = emptyNotificationWorld();
    const repo = createFakeNotificationsRepo(world, () => clock);
    const memberRepo = createFakeMemberRepo();
    const member = createMemberService({ repo: memberRepo, identity: { deleteUser: async () => {} } });
    const service = createAlertsService({ repo, places: searchPlaces, requireAccepted: (u) => member.requireAccepted(u), unsubscribeSecret, now: () => clock });
    const newUser = async () => {
      const id = `user_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      await memberRepo.ensureProfile(id);
      await memberRepo.recordAcceptances(id, [{ policyKind: "terms", version: CURRENT_POLICY_VERSION }, { policyKind: "privacy", version: CURRENT_POLICY_VERSION }]);
      return id;
    };
    const as = (userId: string | null) => {
      const routes = alertRoutes(createApiRoute({ getUserId: async () => userId, onUnexpected: vi.fn() }), () => service);
      const call = async (pending: Promise<Response>) => {
        const res = await pending;
        return { status: res.status, json: (await res.json()) as Json };
      };
      const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) });
      const send = (method: string, body?: unknown) => new Request(`${base}/x`, { method, body: body === undefined ? undefined : JSON.stringify(body) });
      return {
        list: () => call(routes.alerts.GET(send("GET"))),
        create: (body: unknown) => call(routes.alerts.POST(send("POST", body))),
        update: (id: string, body: unknown) => call(routes.alert.PATCH(send("PATCH", body), ctx({ id }))),
        remove: (id: string) => call(routes.alert.DELETE(send("DELETE"), ctx({ id }))),
        registerToken: (body: unknown) => call(routes.pushTokens.POST(send("POST", body))),
        revokeToken: (id: string) => call(routes.pushToken.DELETE(send("DELETE"), ctx({ id }))),
        settings: () => call(routes.settings.GET(send("GET"))),
        setReminders: (reminders: unknown) => call(routes.settings.PUT(send("PUT", { reminders }))),
        mute: (orgId: string) => call(routes.mute.PUT(send("PUT"), ctx({ orgId }))),
        unmute: (orgId: string) => call(routes.mute.DELETE(send("DELETE"), ctx({ orgId }))),
        unsubscribe: (token: string) => call(routes.unsubscribe.POST(send("POST"), ctx({ token }))),
      };
    };
    return { as, newUser, repo, clock };
  };
  const body = (over: Record<string, unknown> = {}) => ({ place: "Nashville, TN", radius: 25, timeframeDays: 14, types: ["worship-nights"], immediate: false, ...over });

  it("signed-out callers get 401 on every member endpoint; only the unsubscribe link is public", async () => {
    const s = setup();
    const api = s.as(null);
    const id = randomUUID();
    for (const r of [await api.list(), await api.create(body()), await api.update(id, {}), await api.remove(id), await api.registerToken({}), await api.revokeToken(id), await api.settings(), await api.setReminders(true), await api.mute(id), await api.unmute(id)]) {
      expect(r.status).toBe(401);
    }
    expect((await api.unsubscribe("A".repeat(40))).status).toBe(404); // reachable without signing in, and refused for not being a real link
  });

  it("AC1/AC7 an alert keeps a rounded point and the label of the typed place, and shows back as entered", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    const r = await api.create(body({ place: "37201", radius: "any", types: [] }));
    expect(r.status).toBe(200);
    expect(r.json.data).toMatchObject({ placeLabel: "ZIP 37201", radius: "any", timeframeDays: 14, types: [], immediate: false, paused: false });
    const [stored] = s.repo.rules();
    expect(Math.abs(stored.lat * 100 - Math.round(stored.lat * 100))).toBeLessThan(1e-6); // two decimals: about 1 km
    expect(Math.abs(stored.lng * 100 - Math.round(stored.lng * 100))).toBeLessThan(1e-6);
    expect(Object.keys(stored).sort()).toEqual(["createdAt", "id", "immediate", "lat", "lng", "paused", "placeLabel", "radiusMiles", "timeframeDays", "types", "userId"]); // no history of places
  });

  it("AC1 an alert can be edited, paused and deleted; changing the place replaces the point (no history)", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    const id = (await api.create(body())).json.data.id;
    expect((await api.update(id, { paused: true })).json.data.paused).toBe(true);
    const moved = await api.update(id, { place: "Memphis, TN", radius: 50, types: ["baptisms", "youth-events"], immediate: true, paused: false });
    expect(moved.json.data).toMatchObject({ placeLabel: "Memphis, TN", radius: 50, types: ["baptisms", "youth-events"], immediate: true, paused: false });
    expect(s.repo.rules()).toHaveLength(1);
    expect((await api.remove(id)).json.data).toEqual({ revoked: true });
    expect((await api.list()).json.data.items).toEqual([]);
    expect((await api.remove(id)).status).toBe(404);
  });

  it("AC1 at most ten alerts", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    for (let i = 0; i < MAX_ALERT_RULES; i++) expect((await api.create(body())).status).toBe(200);
    expect((await api.create(body())).status).toBe(409);
  });

  it("an unknown place is refused with a helpful message, and nothing is stored", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    const r = await api.create(body({ place: "Zzyzzx, TN" }));
    expect(r.status).toBe(400);
    expect(r.json.error?.fieldErrors?.place).toBeTruthy();
    expect(s.repo.rules()).toEqual([]);
  });

  it("hostile input is refused: bad radius, timeframe, types, unknown fields, other people's fields", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    for (const over of [
      { radius: 0 }, { radius: 1000 }, { radius: "ten" }, { timeframeDays: 3 }, { timeframeDays: "7" }, { types: ["bogus"] }, { types: ["baptisms", "baptisms"] },
      { place: "" }, { place: "x".repeat(101) }, { immediate: "yes" }, { userId: "user_other" }, { lat: 1, lng: 2 }, { paused: true }, { id: randomUUID() },
    ]) {
      expect((await api.create(body(over))).status, JSON.stringify(over)).toBe(400);
    }
    expect(s.repo.rules()).toEqual([]);
  });

  it("every read and change is the caller's own: another member's alert is 'not found'", async () => {
    const s = setup();
    const alice = s.as(await s.newUser());
    const bob = s.as(await s.newUser());
    const id = (await alice.create(body())).json.data.id;
    expect((await bob.list()).json.data.items).toEqual([]);
    expect((await bob.update(id, { paused: true })).status).toBe(404);
    expect((await bob.remove(id)).status).toBe(404);
    expect((await alice.list()).json.data.items[0].paused).toBe(false);
    expect((await alice.update("not-a-uuid", {})).status).toBe(404);
  });

  it("alerts need the current policy accepted", async () => {
    const s = setup();
    const stranger = `user_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    expect((await s.as(stranger).create(body())).json.error?.code).toBe("policy_reacceptance_required");
    expect((await s.as(stranger).registerToken({ token: "ExponentPushToken[abcdefgh]", platform: "ios" })).json.error?.code).toBe("policy_reacceptance_required");
  });

  it("AC8 a phone is registered once, moves with its owner, and a revoked phone is gone", async () => {
    const s = setup();
    const aliceId = await s.newUser();
    const alice = s.as(aliceId);
    const bob = s.as(await s.newUser());
    const input = { token: "ExponentPushToken[abcdefgh12345]", platform: "ios" };
    const first = (await alice.registerToken(input)).json.data.id;
    expect((await alice.registerToken(input)).json.data.id).toBe(first); // registering again is the same phone
    expect(s.repo.tokens()).toHaveLength(1);
    for (const bad of [{ token: "short", platform: "ios" }, { token: input.token, platform: "windows" }, { ...input, userId: aliceId }, {}]) {
      expect((await alice.registerToken(bad)).status, JSON.stringify(bad)).toBe(400);
    }
    expect((await bob.revokeToken(first)).status).toBe(404); // not bob's phone
    const moved = (await bob.registerToken(input)).json.data.id; // the phone is now bob's (signed in as bob)
    expect(s.repo.tokens()).toHaveLength(1);
    expect((await alice.revokeToken(moved)).status).toBe(404);
    expect((await bob.revokeToken(moved)).json.data).toEqual({ revoked: true });
    expect(s.repo.tokens()).toEqual([]);
  });

  it("reminders default to on and can be switched off and on", async () => {
    const s = setup();
    const api = s.as(await s.newUser());
    expect((await api.settings()).json.data).toEqual({ reminders: true });
    expect((await api.setReminders(false)).json.data).toEqual({ reminders: false });
    expect((await api.settings()).json.data).toEqual({ reminders: false });
    expect((await api.setReminders("no")).status).toBe(400);
  });

  it("a church can be muted and unmuted by the member", async () => {
    const s = setup();
    const userId = await s.newUser();
    const api = s.as(userId);
    expect((await api.mute(org)).json.data).toEqual({ orgId: org, muted: true });
    expect(s.repo.mutes()).toEqual([{ userId, orgId: org }]);
    expect((await api.unmute(org)).json.data).toEqual({ orgId: org, muted: false });
    expect(s.repo.mutes()).toEqual([]);
    expect((await api.mute("not-a-uuid")).status).toBe(404);
  });

  it("AC5 an unsubscribe link works without signing in: it mutes a church or pauses an alert, and only that", async () => {
    const s = setup();
    const userId = await s.newUser();
    const other = await s.newUser();
    const mine = s.as(userId);
    const alertId = (await mine.create(body())).json.data.id;
    const otherAlertId = (await s.as(other).create(body())).json.data.id;
    const nobody = s.as(null);
    const churchLink = createUnsubscribeToken({ kind: "church", userId, id: org }, secret, s.clock);
    expect((await nobody.unsubscribe(churchLink)).json.data).toEqual({ done: true, what: "church" });
    expect(s.repo.mutes()).toEqual([{ userId, orgId: org }]);
    const alertLink = createUnsubscribeToken({ kind: "alert", userId, id: alertId }, secret, s.clock);
    expect((await nobody.unsubscribe(alertLink)).json.data).toEqual({ done: true, what: "alert" });
    expect((await mine.list()).json.data.items[0].paused).toBe(true);
    expect((await s.as(other).list()).json.data.items[0].paused).toBe(false); // the other member's alert is untouched
    // a link for someone else's alert, made by the same person, cannot pause it
    const crossLink = createUnsubscribeToken({ kind: "alert", userId, id: otherAlertId }, secret, s.clock);
    await nobody.unsubscribe(crossLink);
    expect((await s.as(other).list()).json.data.items[0].paused).toBe(false);
  });

  it("AC5 a forged, altered or expired link does nothing, and without a configured secret links are unavailable", async () => {
    const s = setup();
    const userId = await s.newUser();
    const good = createUnsubscribeToken({ kind: "church", userId, id: org }, secret, s.clock);
    const forged = createUnsubscribeToken({ kind: "church", userId, id: org }, "another-secret-another-secret-another!!", s.clock);
    const expired = createUnsubscribeToken({ kind: "church", userId, id: org }, secret, new Date("2026-01-01T00:00:00Z"));
    for (const token of [forged, expired, `${good}x`, good.replace(".", ".A")]) expect((await s.as(null).unsubscribe(token)).status, token.slice(0, 12)).toBe(404);
    expect(s.repo.mutes()).toEqual([]);
    const unavailable = setup(null);
    const link = createUnsubscribeToken({ kind: "church", userId: "user_x", id: org }, secret, unavailable.clock);
    expect((await unavailable.as(null).unsubscribe(link)).status).toBe(400);
    expect(unavailable.repo.mutes()).toEqual([]);
  });
});
