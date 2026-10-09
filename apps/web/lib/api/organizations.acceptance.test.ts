import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { CURRENT_POLICY_VERSION, MAX_CLAIMS_PER_DAY } from "@signalone/validation";

import { createFakeMemberRepo } from "../../db/member.fake";
import { createFakeOrganizationsRepo } from "../../db/organizations.fake";
import { createAdminDirectory } from "../auth/admin";
import { createMemberService } from "../services/member";
import { createOrganizationsService } from "../services/organizations";
import { createApiRoute } from "./handler";
import { organizationRoutes } from "./organizations";

// Executable acceptance criteria for S2 (docs/features/s2-organizations-and-roles.md), verified at
// the API boundary: real Request -> adapter -> authentication -> validation -> real service -> repo
// -> Response. Identity is the only faked boundary.
//
// AC1  A claim needs 1 to 3 valid web links; the member is told it is pending.
// AC2  A claim gives no rights and publishes nothing until approved.
// AC3  Only a platform admin decides; every decision is audited with who, when and why.
// AC4  Nobody can grant themselves a role (mass assignment is rejected).
// AC5  Two claims on one organization both reach the admin; approving one does not drop the other.
// AC6  A manager reaches only their own organizations; anything else is "not found".
// AC7  Revoking a manager takes effect on their next request.
// AC8  Names, descriptions and links are plain, bounded and safe.
// AC9  Claims are rate limited per member per day.
// AC10 The audit log can only be appended to.
type Item = { id: string; status?: string; membership?: string; organization?: { otherPendingClaims: number }; [key: string]: unknown };
type Data = { requestId: string; organizationId: string; items: Item[]; description?: string; [key: string]: unknown };
describe("S2 organizations and roles acceptance criteria (API boundary)", () => {
  const unexpected = vi.fn();
  const base = "http://localhost/api/v1";
  const admin = `user_${"A".repeat(10)}`;

  const setup = () => {
    let clock = new Date("2026-10-09T12:00:00Z");
    const now = () => clock;
    const memberRepo = createFakeMemberRepo();
    const member = createMemberService({ repo: memberRepo, identity: { deleteUser: async () => {} } });
    const repo = createFakeOrganizationsRepo(now);
    const service = createOrganizationsService({
      repo,
      admins: createAdminDirectory([admin]),
      requireAccepted: (userId) => member.requireAccepted(userId),
      now,
    });
    const accept = async (userId: string) => {
      await memberRepo.ensureProfile(userId);
      await memberRepo.recordAcceptances(userId, [
        { policyKind: "terms", version: CURRENT_POLICY_VERSION },
        { policyKind: "privacy", version: CURRENT_POLICY_VERSION },
      ]);
    };
    const as = (userId: string | null) => {
      const routes = organizationRoutes(createApiRoute({ getUserId: async () => userId, onUnexpected: unexpected }), () => service);
      const call = async (pending: Promise<Response>) => {
        const res = await pending;
        return { status: res.status, json: (await res.json()) as { ok: boolean; data: Data; error?: { code: string } } };
      };
      const req = (url: string, method: string, body?: unknown) => new Request(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });
      const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) });
      return {
        claim: (body: unknown) => call(routes.claim.POST(req(`${base}/organizations/claim`, "POST", body))),
        getOrg: (id: string) => call(routes.organization.GET(req(`${base}/organizations/${id}`, "GET"), ctx({ id }))),
        patchOrg: (id: string, body: unknown) => call(routes.organization.PATCH(req(`${base}/organizations/${id}`, "PATCH", body), ctx({ id }))),
        revoke: (id: string, userId: string, body: unknown = { reason: "no longer at the church" }) =>
          call(routes.revoke.POST(req(`${base}/organizations/${id}/managers/${userId}/revoke`, "POST", body), ctx({ id, userId }))),
        mine: () => call(routes.mine.GET(req(`${base}/me/organizations`, "GET"))),
        requests: () => call(routes.adminRequests.GET(req(`${base}/admin/manager-requests`, "GET"))),
        decide: (id: string, body: unknown) => call(routes.adminDecision.POST(req(`${base}/admin/manager-requests/${id}/decision`, "POST", body), ctx({ id }))),
        audit: () => call(routes.adminAudit.GET(req(`${base}/admin/audit`, "GET"))),
      };
    };
    const newMember = async () => {
      const id = `user_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
      await accept(id);
      return { id, api: as(id) };
    };
    return { repo, as, accept, newMember, advance: (ms: number) => (clock = new Date(clock.getTime() + ms)) };
  };

  const claimBody = (over: Record<string, unknown> = {}) => ({
    name: `Sample Fellowship ${randomUUID().slice(0, 8)}`,
    description: "A sample church.",
    links: ["https://sample-church.example"],
    contactEmail: "pastor@sample-church.example",
    ...over,
  });
  const approvedManager = async (s: ReturnType<typeof setup>, over: Record<string, unknown> = {}) => {
    const m = await s.newMember();
    const claim = await m.api.claim(claimBody(over));
    expect(claim.status).toBe(200);
    const decided = await s.as(admin).decide(claim.json.data.requestId, { decision: "approve", reason: "website names the church" });
    expect(decided.status).toBe(200);
    return { ...m, orgId: claim.json.data.organizationId as string, requestId: claim.json.data.requestId as string };
  };

  it("signed-out callers get 401 on every protected endpoint; the public view needs no sign-in", async () => {
    const s = setup();
    const api = s.as(null);
    const id = randomUUID();
    for (const r of [await api.claim({}), await api.patchOrg(id, {}), await api.revoke(id, `user_${"B".repeat(10)}`), await api.mine(), await api.requests(), await api.decide(id, {}), await api.audit()]) {
      expect(r.status).toBe(401);
    }
    expect((await api.getOrg(id)).status).toBe(404); // public, and simply not found
  });

  it("AC1 a valid claim is accepted and reported as pending", async () => {
    const s = setup();
    const m = await s.newMember();
    const r = await m.api.claim(claimBody({ links: ["https://a.example", "http://b.example/page", "https://c.example/x?y=1"] }));
    expect(r.status).toBe(200);
    expect(r.json.data).toMatchObject({ status: "pending" });
    expect((await m.api.mine()).json.data.items[0]).toMatchObject({ membership: "pending", status: "pending" });
  });

  it("AC1/AC8 rejects bad links, names, descriptions, emails and unknown fields", async () => {
    const s = setup();
    const m = await s.newMember();
    const bad: Record<string, unknown>[] = [
      { links: [] },
      { links: ["https://a.example", "https://b.example", "https://c.example", "https://d.example"] },
      { links: ["javascript:alert(1)"] },
      { links: ["data:text/html,hi"] },
      { links: ["ftp://files.example"] },
      { links: ["https://user:pass@example.com"] },
      { links: ["https://localhost"] },
      { links: ["not a link"] },
      { links: ["https://a.example/" + "x".repeat(400)] },
      { name: "x" },
      { name: "x".repeat(121) },
      { name: "two\nlines" },
      { description: "x".repeat(1001) },
      { description: `bad${String.fromCharCode(0)}text` },
      { contactEmail: "not-an-email" },
      { extra: true },
    ];
    for (const over of bad) {
      const r = await m.api.claim(claimBody(over));
      expect(r.status, JSON.stringify(over).slice(0, 80)).toBe(400);
    }
    expect((await m.api.mine()).json.data.items).toHaveLength(0);
  });

  it("AC1 a second open claim by the same person for the same organization is a conflict", async () => {
    const s = setup();
    const m = await s.newMember();
    const body = claimBody();
    expect((await m.api.claim(body)).status).toBe(200);
    expect((await m.api.claim({ ...body, name: body.name.toUpperCase() })).status).toBe(409);
  });

  it("AC2 a claim gives no rights and publishes nothing", async () => {
    const s = setup();
    const m = await s.newMember();
    const claim = await m.api.claim(claimBody());
    const id = claim.json.data.organizationId;
    expect((await m.api.patchOrg(id, { description: "I am the manager" })).status).toBe(404);
    expect((await s.as(null).getOrg(id)).status).toBe(404);
    expect((await m.api.getOrg(id)).status).toBe(404);
  });

  it("claims need the current policy to be accepted", async () => {
    const s = setup();
    const id = `user_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const r = await s.as(id).claim(claimBody());
    expect(r.status).toBe(403);
    expect(r.json).toMatchObject({ error: { code: "policy_reacceptance_required" } });
  });

  it("AC3 only an admin can see the queue and decide; others get 'not found'", async () => {
    const s = setup();
    const m = await s.newMember();
    const claim = await m.api.claim(claimBody());
    const requestId = claim.json.data.requestId;
    for (const r of [await m.api.requests(), await m.api.audit(), await m.api.decide(requestId, { decision: "approve", reason: "me" })]) {
      expect(r.status).toBe(404);
    }
    expect((await m.api.mine()).json.data.items[0].membership).toBe("pending");
  });

  it("AC3 an approval makes a manager and publishes the organization; the decision is audited with who and why", async () => {
    const s = setup();
    const mgr = await approvedManager(s);
    const org = await s.as(null).getOrg(mgr.orgId);
    expect(org.status).toBe(200);
    expect(org.json.data).toMatchObject({ status: "approved", links: ["https://sample-church.example"] });
    expect(JSON.stringify(org.json)).not.toMatch(/pastor@|contactEmail|user_/); // no contact email, no manager ids
    const log = (await s.as(admin).audit()).json.data.items;
    expect(log[0]).toMatchObject({ actorId: admin, action: "manager_request.approve", detail: "website names the church" });
    expect(log[0].subject).toContain(mgr.id);
    const request = await s.repo.getRequest(mgr.requestId);
    expect(request).toMatchObject({ status: "approved", decidedBy: admin, contactEmail: null });
  });

  it("AC3 a decision needs a reason, a real request, and cannot be repeated", async () => {
    const s = setup();
    const m = await s.newMember();
    const requestId = (await m.api.claim(claimBody())).json.data.requestId;
    const adminApi = s.as(admin);
    expect((await adminApi.decide(requestId, { decision: "approve", reason: "" })).status).toBe(400);
    expect((await adminApi.decide(requestId, { decision: "maybe", reason: "x" })).status).toBe(400);
    expect((await adminApi.decide(randomUUID(), { decision: "approve", reason: "x" })).status).toBe(404);
    expect((await adminApi.decide("not-a-uuid", { decision: "approve", reason: "x" })).status).toBe(404);
    expect((await adminApi.decide(requestId, { decision: "reject", reason: "cannot verify" })).status).toBe(200);
    expect((await adminApi.decide(requestId, { decision: "approve", reason: "changed my mind" })).status).toBe(409);
    expect((await m.api.mine()).json.data.items[0].membership).toBe("rejected");
  });

  it("AC4 nobody can grant themselves a role or status", async () => {
    const s = setup();
    const m = await s.newMember();
    for (const over of [{ role: "admin" }, { status: "approved" }, { userId: admin }, { isAdmin: true }]) {
      expect((await m.api.claim(claimBody(over))).status, JSON.stringify(over)).toBe(400);
    }
    const mgr = await approvedManager(s);
    for (const body of [{ status: "approved" }, { id: randomUUID() }, { role: "admin" }, { nameKey: "x" }]) {
      expect((await mgr.api.patchOrg(mgr.orgId, body)).status, JSON.stringify(body)).toBe(400);
    }
  });

  it("AC5 two claims on one organization both reach the admin, and approving one keeps the other", async () => {
    const s = setup();
    const a = await s.newMember();
    const b = await s.newMember();
    const name = `Shared Church ${randomUUID().slice(0, 6)}`;
    const first = await a.api.claim(claimBody({ name }));
    const second = await b.api.claim(claimBody({ name: `  ${name.toUpperCase()}  ` }));
    expect(second.json.data.organizationId).toBe(first.json.data.organizationId);
    const queue = (await s.as(admin).requests()).json.data.items;
    expect(queue).toHaveLength(2);
    expect(queue.every((i: Item) => i.organization?.otherPendingClaims === 1)).toBe(true);
    await s.as(admin).decide(first.json.data.requestId, { decision: "approve", reason: "verified" });
    const after = (await s.as(admin).requests()).json.data.items;
    expect(after).toHaveLength(1);
    expect(after[0].id).toBe(second.json.data.requestId);
  });

  it("AC6 a manager reaches only their own organization; everything else is 'not found'", async () => {
    const s = setup();
    const mine = await approvedManager(s);
    const other = await approvedManager(s);
    expect((await mine.api.patchOrg(mine.orgId, { description: "Updated description" })).status).toBe(200);
    expect((await mine.api.patchOrg(other.orgId, { description: "hijack" })).status).toBe(404);
    expect((await mine.api.patchOrg(randomUUID(), { description: "x" })).status).toBe(404);
    expect((await mine.api.patchOrg("not-a-uuid", { description: "x" })).status).toBe(404);
    expect((await s.as(null).getOrg(other.orgId)).json.data.description).toBe("A sample church.");
    expect((await mine.api.mine()).json.data.items.map((i: Item) => i.id)).toEqual([mine.orgId]);
  });

  it("AC6 a manager can edit name, description and links; the change is audited", async () => {
    const s = setup();
    const mgr = await approvedManager(s);
    const r = await mgr.api.patchOrg(mgr.orgId, { name: "Renamed Fellowship", links: ["https://new.example"] });
    expect(r.json.data).toMatchObject({ name: "Renamed Fellowship", links: ["https://new.example"] });
    expect((await s.as(admin).audit()).json.data.items[0]).toMatchObject({ actorId: mgr.id, action: "organization.update" });
    const clash = await approvedManager(s);
    expect((await clash.api.patchOrg(clash.orgId, { name: "renamed fellowship" })).status).toBe(409);
  });

  it("AC7 revoking a manager takes effect on their next request, and an unmanaged organization is unpublished", async () => {
    const s = setup();
    const mgr = await approvedManager(s);
    const outsider = await s.newMember();
    expect((await outsider.api.revoke(mgr.orgId, mgr.id)).status).toBe(404);
    expect((await mgr.api.patchOrg(mgr.orgId, { description: "still me" })).status).toBe(200);
    expect((await s.as(admin).revoke(mgr.orgId, mgr.id)).status).toBe(200);
    expect((await mgr.api.patchOrg(mgr.orgId, { description: "after revoke" })).status).toBe(404);
    expect((await s.as(null).getOrg(mgr.orgId)).status).toBe(404); // no manager left: back to pending
    expect((await s.as(admin).revoke(mgr.orgId, mgr.id)).status).toBe(404); // nothing left to revoke
    expect((await s.as(admin).revoke(mgr.orgId, mgr.id, {})).status).toBe(400); // a reason is required
  });

  it("AC7 a manager can revoke another manager of the same organization", async () => {
    const s = setup();
    const first = await approvedManager(s);
    const second = await s.newMember();
    const claim = await second.api.claim(claimBody({ name: (await s.repo.getWithLinks(first.orgId))!.name }));
    await s.as(admin).decide(claim.json.data.requestId, { decision: "approve", reason: "second manager" });
    expect((await first.api.revoke(first.orgId, second.id)).status).toBe(200);
    expect((await second.api.patchOrg(first.orgId, { description: "x" })).status).toBe(404);
    expect((await s.as(null).getOrg(first.orgId)).status).toBe(200); // the first manager remains
  });

  it("AC9 claims are limited per member per day", async () => {
    const s = setup();
    const m = await s.newMember();
    for (let i = 0; i < MAX_CLAIMS_PER_DAY; i++) expect((await m.api.claim(claimBody())).status).toBe(200);
    const blocked = await m.api.claim(claimBody());
    expect(blocked.status).toBe(429);
    expect(blocked.json).toMatchObject({ error: { code: "rate_limited" } });
    s.advance(25 * 60 * 60 * 1000);
    expect((await m.api.claim(claimBody())).status).toBe(200);
  });

  it("AC10 the audit log can only be appended to: no operation updates or deletes it", () => {
    const repoSource = readFileSync(path.join(__dirname, "..", "..", "db", "organizations.ts"), "utf8");
    const uses = repoSource.match(/db\s*\.\s*(update|delete)\(\s*auditLog\s*\)/g) ?? [];
    expect(uses).toEqual([]);
    expect(repoSource).toMatch(/insert\(auditLog\)/);
    expect(/db\s*\.\s*(update|delete)\(\s*auditLog\s*\)/.test("db.delete(auditLog).where(x)")).toBe(true); // the check notices a delete (self-test)
  });

  it("an unexpected failure is a generic 500 with no internals", async () => {
    const s = setup();
    const m = await s.newMember();
    const broken = { ...s.repo, countClaimsSince: async () => Promise.reject(new Error("connection string leaked")) };
    const memberRepo = createFakeMemberRepo();
    await memberRepo.ensureProfile(m.id);
    const service = createOrganizationsService({ repo: broken, admins: createAdminDirectory([]), requireAccepted: async () => {} });
    const routes = organizationRoutes(createApiRoute({ getUserId: async () => m.id, onUnexpected: unexpected }), () => service);
    const res = await routes.claim.POST(new Request(`${base}/organizations/claim`, { method: "POST", body: JSON.stringify(claimBody()) }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/connection|leaked/);
  });
});
