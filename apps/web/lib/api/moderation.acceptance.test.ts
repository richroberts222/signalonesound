import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { CURRENT_POLICY_VERSION, MAX_REPORTS_PER_ADDRESS_PER_DAY } from "@signalone/validation";

import { createFakeMemberRepo } from "../../db/member.fake";
import { createFakeModerationRepo, emptyWorld } from "../../db/moderation.fake";
import { createAdminDirectory } from "../auth/admin";
import { EmailSendError, type EmailMessage } from "../messaging/email";
import { createMemberService } from "../services/member";
import { createModerationService } from "../services/moderation";
import { createApiRoute } from "./handler";
import { moderationRoutes } from "./moderation";

// Executable acceptance criteria for S8 (docs/features/s8-admin-and-moderation.md), verified at the API
// boundary: real Request -> adapter -> authentication -> validation -> real service -> repo.
//
// AC1 Anyone can report; no identity is kept and one address is limited.  AC2/AC7/AC10 Only admins, checked
// on every request; everyone else gets "not found".  AC4 A suspended member cannot change events or claim.
// AC5 Affected people are told what happened, with no one else's details.  AC8 The audit log can be
// filtered and its export is itself audited.  AC11 Every admin write needs a reason and cannot be repeated.
type Json = { ok: boolean; data: any; error?: { code: string; fieldErrors?: Record<string, string[]> } }; // eslint-disable-line @typescript-eslint/no-explicit-any
const DAY = 24 * 3600 * 1000;

describe("S8 admin and moderation acceptance criteria (API boundary)", () => {
  const base = "http://localhost/api/v1";
  const admin = `user_${"A".repeat(10)}`;
  const org = randomUUID();

  const setup = () => {
    let clock = new Date("2026-10-09T12:00:00Z");
    const now = () => clock;
    const world = emptyWorld();
    world.orgs.set(org, { name: "Sample Fellowship", status: "approved" });
    const manager = `user_${"M".repeat(10)}`;
    world.members.set(manager, { suspended: false });
    world.managers.push({ orgId: org, userId: manager });
    const repo = createFakeModerationRepo(world, now);
    const sent: EmailMessage[] = [];
    const emailAddresses = new Map<string, string>([[manager, "manager@sample-church.example"]]);
    const email = { send: vi.fn(async (m: EmailMessage) => void sent.push(m)) };
    const admins = { list: [admin] };
    const service = createModerationService({
      repo,
      admins: { isAdmin: (id) => createAdminDirectory(admins.list).isAdmin(id) }, // read on every request
      email,
      emails: { getPrimaryEmail: async (id) => emailAddresses.get(id) ?? null },
      addressSalt: "a-test-salt-of-sufficient-length",
      now,
    });
    const getUserId = vi.fn();
    const as = (userId: string | null) => {
      getUserId.mockResolvedValue(userId);
      const routes = moderationRoutes(createApiRoute({ getUserId, onUnexpected: vi.fn() }), () => service);
      const call = async (pending: Promise<Response>) => {
        const res = await pending;
        return { status: res.status, json: (await res.json()) as Json };
      };
      const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) });
      const post = (url: string, body: unknown, headers: Record<string, string> = {}) => new Request(url, { method: "POST", body: JSON.stringify(body), headers });
      return {
        report: (body: unknown, address = "203.0.113.7") => call(routes.report.POST(post(`${base}/reports`, body, { "x-forwarded-for": address }))),
        overview: () => call(routes.overview.GET(new Request(`${base}/admin/overview`))),
        reports: (query = "") => call(routes.reports.GET(new Request(`${base}/admin/reports${query}`))),
        decide: (id: string, body: unknown) => call(routes.reportDecision.POST(post(`${base}/x`, body), ctx({ id }))),
        hide: (id: string, body: unknown) => call(routes.hideEvent.POST(post(`${base}/x`, body), ctx({ id }))),
        restore: (id: string, body: unknown) => call(routes.restoreEvent.POST(post(`${base}/x`, body), ctx({ id }))),
        unpublish: (id: string, body: unknown) => call(routes.unpublishOrganization.POST(post(`${base}/x`, body), ctx({ id }))),
        restoreOrg: (id: string, body: unknown) => call(routes.restoreOrganization.POST(post(`${base}/x`, body), ctx({ id }))),
        suspend: (userId: string, body: unknown) => call(routes.suspend.POST(post(`${base}/x`, body), ctx({ userId }))),
        reinstate: (userId: string, body: unknown) => call(routes.reinstate.POST(post(`${base}/x`, body), ctx({ userId }))),
        audit: (query = "") => call(routes.auditSearch.GET(new Request(`${base}/admin/audit/search${query}`))),
        auditExport: (query = "") => call(routes.auditExport.GET(new Request(`${base}/admin/audit/export${query}`))),
      };
    };
    let n = 0;
    const addEvent = (over: Partial<{ status: string; moderationState: string }> = {}) => {
      const id = randomUUID();
      world.events.set(id, { orgId: org, title: `Event ${++n}`, status: "published", moderationState: "published", ...over });
      return id;
    };
    return { as, world, repo, sent, email, emailAddresses, admins, manager, addEvent, getUserId, advance: (ms: number) => (clock = new Date(clock.getTime() + ms)) };
  };
  const reportBody = (over: Record<string, unknown> = {}, subjectId?: string) => ({ subjectType: "event", subjectId, reason: "not_real", ...over });

  it("AC1 anyone can report without signing in, and no identity is read or kept", async () => {
    const s = setup();
    const id = s.addEvent();
    const r = await s.as(null).report(reportBody({ details: "I do not think this is real." }, id));
    expect(r.status).toBe(200);
    expect(r.json.data).toEqual({ received: true });
    expect(s.getUserId).not.toHaveBeenCalled();
    expect(Object.keys(s.repo.reports[0]).sort()).toEqual(["createdAt", "decidedAt", "details", "id", "reason", "status", "subjectId", "subjectType"]); // no reporter field exists
    const stored = JSON.stringify(s.repo.rateRows);
    expect(stored).not.toContain("203.0.113.7"); // only a keyed hash of the address
    expect(s.repo.rateRows[0].addressHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("AC1 reports are validated: reason, details, subject and unknown fields", async () => {
    const s = setup();
    const id = s.addEvent();
    const draft = s.addEvent({ status: "draft" });
    for (const over of [{ reason: "bogus" }, { reason: undefined }, { details: "x".repeat(1001) }, { details: `bad${String.fromCharCode(0)}` }, { subjectType: "member" }, { extra: 1 }, { reporter: "me" }]) {
      expect((await s.as(null).report(reportBody(over, id))).status, JSON.stringify(over)).toBe(400);
    }
    expect((await s.as(null).report(reportBody({}, draft))).status).toBe(404); // a draft is not public, so nothing to report
    expect((await s.as(null).report(reportBody({}, randomUUID()))).status).toBe(404);
    expect((await s.as(null).report(reportBody({ details: "x".repeat(1000) }, id))).status).toBe(200);
  });

  it("AC1 one address is limited per day; another address and the next day are not", async () => {
    const s = setup();
    const id = s.addEvent();
    for (let i = 0; i < MAX_REPORTS_PER_ADDRESS_PER_DAY; i++) expect((await s.as(null).report(reportBody({}, id))).status).toBe(200);
    const blocked = await s.as(null).report(reportBody({}, id));
    expect(blocked.status).toBe(429);
    expect(blocked.json.error?.code).toBe("rate_limited");
    expect((await s.as(null).report(reportBody({}, id), "198.51.100.9")).status).toBe(200);
    s.advance(25 * 3600 * 1000);
    expect((await s.as(null).report(reportBody({}, id))).status).toBe(200);
    expect(await s.repo.purgeRateLimits(new Date(Date.parse("2026-10-09T12:00:00Z") + DAY))).toBeGreaterThan(0);
  });

  it("the retention job removes report limit records after a day, and no sooner", async () => {
    const s = setup();
    const id = s.addEvent();
    await s.as(null).report(reportBody({}, id));
    const service = createModerationService({ repo: s.repo, admins: { isAdmin: () => false }, email: s.email, emails: { getPrimaryEmail: async () => null }, addressSalt: "a-test-salt-of-sufficient-length", now: () => new Date(Date.parse("2026-10-09T12:00:00Z") + 23 * 3600 * 1000) });
    expect(await service.purgeRateLimits()).toBe(0);
    const later = createModerationService({ repo: s.repo, admins: { isAdmin: () => false }, email: s.email, emails: { getPrimaryEmail: async () => null }, addressSalt: "a-test-salt-of-sufficient-length", now: () => new Date(Date.parse("2026-10-09T12:00:00Z") + 25 * 3600 * 1000) });
    expect(await later.purgeRateLimits()).toBe(1);
    expect(s.repo.rateRows).toHaveLength(0);
  });

  it("AC2/AC7 every admin endpoint is 401 signed out and 'not found' to a member who is not an admin", async () => {
    const s = setup();
    const id = s.addEvent();
    const probe = (api: ReturnType<typeof s.as>) => [
      api.overview(), api.reports(), api.decide(randomUUID(), { decision: "dismiss", reason: "x" }), api.hide(id, { reason: "x" }), api.restore(id, { reason: "x" }),
      api.unpublish(org, { reason: "x" }), api.restoreOrg(org, { reason: "x" }), api.suspend(s.manager, { reason: "x", eventsAction: "keep" }), api.reinstate(s.manager, { reason: "x" }),
      api.audit(), api.auditExport(),
    ];
    for (const r of await Promise.all(probe(s.as(null)))) expect(r.status).toBe(401);
    for (const r of await Promise.all(probe(s.as(`user_${"X".repeat(10)}`)))) expect(r.status).toBe(404);
    expect(s.world.events.get(id)?.moderationState).toBe("published");
    expect(s.repo.audit).toHaveLength(0);
  });

  it("AC10 the admin list is checked on every request: removing an admin takes effect at once", async () => {
    const s = setup();
    expect((await s.as(admin).overview()).status).toBe(200);
    s.admins.list = [];
    expect((await s.as(admin).overview()).status).toBe(404);
  });

  it("AC11 every admin write needs a reason, and an unknown target is 'not found'", async () => {
    const s = setup();
    const id = s.addEvent();
    const api = s.as(admin);
    for (const r of [
      await api.hide(id, {}), await api.hide(id, { reason: "" }), await api.hide(id, { reason: "   " }), await api.hide(id, { reason: "x".repeat(501) }),
      await api.unpublish(org, {}), await api.suspend(s.manager, { eventsAction: "keep" }), await api.suspend(s.manager, { reason: "x" }), await api.decide(randomUUID(), { decision: "dismiss" }),
      await api.hide(id, { reason: "ok", extra: true }),
    ]) expect(r.status).toBe(400);
    expect(s.world.events.get(id)?.moderationState).toBe("published");
    for (const r of [await api.hide(randomUUID(), { reason: "x" }), await api.hide("not-a-uuid", { reason: "x" }), await api.unpublish(randomUUID(), { reason: "x" }), await api.suspend(`user_${"Z".repeat(10)}`, { reason: "x", eventsAction: "keep" }), await api.suspend("nope", { reason: "x", eventsAction: "keep" })]) {
      expect(r.status).toBe(404);
    }
  });

  it("AC11/AC2 hide and restore an event: each is audited with who, what and why, and cannot be repeated", async () => {
    const s = setup();
    const id = s.addEvent();
    const api = s.as(admin);
    expect((await api.restore(id, { reason: "not hidden" })).status).toBe(409);
    expect((await api.hide(id, { reason: "misleading address" })).json.data).toEqual({ id, state: "hidden" });
    expect((await api.hide(id, { reason: "again" })).status).toBe(409);
    expect((await api.restore(id, { reason: "checked and fine" })).json.data).toEqual({ id, state: "published" });
    expect(s.repo.audit.map((a) => [a.action, a.actorId, a.subject, a.detail])).toEqual([
      ["event.hide", admin, `event:${id}`, "misleading address"],
      ["event.restore", admin, `event:${id}`, "checked and fine"],
    ]);
  });

  it("AC11 unpublishing a church can be undone once, not twice; a church that is not approved cannot be unpublished", async () => {
    const s = setup();
    const api = s.as(admin);
    expect((await api.restoreOrg(org, { reason: "x" })).status).toBe(409);
    expect((await api.unpublish(org, { reason: "false claims" })).json.data.state).toBe("unpublished");
    expect((await api.unpublish(org, { reason: "again" })).status).toBe(409);
    expect((await api.restoreOrg(org, { reason: "resolved" })).json.data.state).toBe("approved");
  });

  it("AC11 a report is decided once, and the queue shows what was reported", async () => {
    const s = setup();
    const id = s.addEvent();
    await s.as(null).report(reportBody({ reason: "wrong_church" }, id));
    const api = s.as(admin);
    const queue = (await api.reports()).json.data.items;
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ subjectType: "event", subjectId: id, subjectTitle: "Event 1", reason: "wrong_church", status: "open" });
    expect((await api.overview()).json.data.openReports).toBe(1);
    expect((await api.decide(queue[0].id, { decision: "dismiss", reason: "the address is correct" })).json.data.state).toBe("dismissed");
    expect((await api.decide(queue[0].id, { decision: "action", reason: "changed my mind" })).status).toBe(409);
    expect((await api.reports()).json.data.items).toHaveLength(0);
    expect((await api.reports("?status=dismissed")).json.data.items).toHaveLength(1);
    expect((await api.reports("?status=bogus")).status).toBe(400);
  });

  it("AC4 a suspended member cannot change events or claim, but can still browse, export and delete", async () => {
    const s = setup();
    const memberRepo = createFakeMemberRepo();
    const member = createMemberService({ repo: memberRepo, identity: { deleteUser: async () => {} } });
    await memberRepo.ensureProfile(s.manager);
    await memberRepo.recordAcceptances(s.manager, [{ policyKind: "terms", version: CURRENT_POLICY_VERSION }, { policyKind: "privacy", version: CURRENT_POLICY_VERSION }]);
    await expect(member.requireActiveMember(s.manager)).resolves.toBeUndefined();
    await memberRepo.updateProfile(s.manager, {});
    (await memberRepo.findProfile(s.manager))!.suspended = true; // mirrors the repo flag the admin action sets
    const suspendedRepo = { ...memberRepo, findProfile: async () => ({ ...(await memberRepo.findProfile(s.manager))!, suspended: true }) };
    const blocked = createMemberService({ repo: suspendedRepo, identity: { deleteUser: async () => {} } });
    await expect(blocked.requireActiveMember(s.manager)).rejects.toMatchObject({ code: "forbidden" });
    const ctx = { actor: { userId: s.manager } };
    await expect(blocked.exportData(ctx)).resolves.toBeDefined();
    await expect(blocked.deleteAccount(ctx)).resolves.toEqual({ deleted: true });
    await expect(blocked.getProfile(ctx)).resolves.toBeDefined();
  });

  it("AC4 suspending can hide the member's events or keep them; the member is told; admins and unknown people cannot be suspended", async () => {
    const s = setup();
    const kept = s.addEvent();
    const api = s.as(admin);
    s.world.members.set(admin, { suspended: false });
    expect((await api.suspend(s.manager, { reason: "spam listings", eventsAction: "keep" })).json.data).toEqual({ id: s.manager, state: "suspended" });
    expect(s.world.events.get(kept)?.moderationState).toBe("published");
    expect((await api.suspend(s.manager, { reason: "again", eventsAction: "keep" })).status).toBe(409);
    expect((await api.reinstate(s.manager, { reason: "appeal accepted" })).json.data.state).toBe("active");
    expect((await api.reinstate(s.manager, { reason: "again" })).status).toBe(409);
    expect((await api.suspend(s.manager, { reason: "second time", eventsAction: "hide" })).status).toBe(200);
    expect(s.world.events.get(kept)?.moderationState).toBe("hidden");
    expect((await api.suspend(admin, { reason: "self", eventsAction: "keep" })).status).toBe(409);
    s.world.members.set("user_OtherAdmin1", { suspended: false });
    s.admins.list = [admin, "user_OtherAdmin1"];
    expect((await api.suspend("user_OtherAdmin1", { reason: "x", eventsAction: "keep" })).status).toBe(409);
    expect(s.repo.audit.map((a) => a.action)).toEqual(["member.suspend", "member.reinstate", "member.suspend"]);
  });

  it("AC5 the people affected are told what happened, why and how to appeal, with no one else's details", async () => {
    const s = setup();
    const id = s.addEvent();
    s.world.members.set(admin, { suspended: false });
    const api = s.as(admin);
    await api.hide(id, { reason: "misleading address" });
    await api.unpublish(org, { reason: "false claims" });
    await api.suspend(s.manager, { reason: "spam listings", eventsAction: "keep" });
    expect(s.sent.map((m) => m.subject)).toEqual(["One of your events was hidden", "Your church or ministry was unpublished", "Your account was suspended"]);
    for (const m of s.sent) {
      expect(m.to).toBe("manager@sample-church.example");
      expect(m.text).toContain("Reason given:");
      expect(m.text).toContain("To appeal");
      expect(m.text).not.toContain(admin); // not the admin's identity
      expect(m.text).not.toContain(s.manager);
    }
    expect(s.sent[0].text).toContain("misleading address");
    await api.restore(id, { reason: "fine now" });
    await api.restoreOrg(org, { reason: "fine now" });
    expect(s.sent).toHaveLength(3); // nothing is sent for a restore
  });

  it("AC5 a person with no address, or an email that fails, never blocks the action", async () => {
    const s = setup();
    const id = s.addEvent();
    s.emailAddresses.clear();
    expect((await s.as(admin).hide(id, { reason: "x" })).status).toBe(200);
    expect(s.sent).toHaveLength(0);
    s.emailAddresses.set(s.manager, "manager@sample-church.example");
    const id2 = s.addEvent();
    s.email.send.mockRejectedValueOnce(new Error("provider down"));
    expect((await s.as(admin).hide(id2, { reason: "x" })).status).toBe(200);
    expect(s.world.events.get(id2)?.moderationState).toBe("hidden");
  });

  it("S14 AC9 every typed email failure (rejected, not allowed, account, throttled, unavailable) leaves the action done", async () => {
    for (const kind of ["rejected", "not_allowed", "account", "throttled", "unavailable"] as const) {
      const s = setup();
      const id = s.addEvent();
      s.email.send.mockRejectedValueOnce(new EmailSendError(kind, "provider problem"));
      expect((await s.as(admin).hide(id, { reason: "x" })).status, kind).toBe(200);
      expect(s.world.events.get(id)?.moderationState, kind).toBe("hidden");
    }
  });

  it("AC8 the audit log is filtered by actor, subject and date; the export is limited to admins and is itself audited", async () => {
    const s = setup();
    const a = s.addEvent();
    const b = s.addEvent();
    const api = s.as(admin);
    await api.hide(a, { reason: "one" });
    s.advance(2 * DAY);
    await api.hide(b, { reason: "two" });
    expect((await api.audit()).json.data.items).toHaveLength(2);
    expect((await api.audit(`?subject=${a}`)).json.data.items).toHaveLength(1);
    expect((await api.audit(`?actor=${admin}`)).json.data.items).toHaveLength(2);
    expect((await api.audit("?actor=nobody")).json.data.items).toHaveLength(0);
    expect((await api.audit("?from=2026-10-11")).json.data.items.map((i: { detail: string }) => i.detail)).toEqual(["two"]);
    expect((await api.audit("?from=2026-10-12&to=2026-10-10")).status).toBe(400);
    expect((await api.audit("?unknown=1")).status).toBe(400);
    const before = s.repo.audit.length;
    const exported = await api.auditExport("?actor=" + admin);
    expect(exported.json.data.items).toHaveLength(2);
    expect(s.repo.audit.length).toBe(before + 1);
    expect(s.repo.audit[s.repo.audit.length - 1]).toMatchObject({ action: "audit.export", actorId: admin });
    expect((await s.as(`user_${"X".repeat(10)}`).auditExport()).status).toBe(404);
  });
});
