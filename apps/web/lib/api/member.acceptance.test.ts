import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import {
  CURRENT_POLICY_VERSION,
  DISPLAY_NAME_MAX,
  dataExportSchema,
  profileSchema,
  resultSchema,
} from "@signalone/validation";

import { MEMBER_TABLES } from "../../db/member";
import { createFakeMemberRepo } from "../../db/member.fake";
import { createMemberService, type IdentityAdmin } from "../services/member";
import { createApiRoute } from "./handler";
import { clerkWebhookRoutes, memberRoutes, type VerifiedWebhookEvent } from "./member";

// Executable acceptance criteria for S1 (docs/features/s1-identity-and-policy.md), verified at the
// API boundary: real Request -> adapter -> authentication -> validation -> real service -> repo ->
// Response. Identity and the Clerk admin call are the only faked boundaries.
//
// AC1  Policy acceptance needs the 18+ attestation; the version and time are recorded.
// AC2  A new policy version blocks member endpoints (403 policy_reacceptance_required) until re-accepted.
// AC3  GET/PATCH /me touch only the caller's profile and only allowed fields (no role injection).
// AC4  The export holds everything about the caller and nothing about anyone else.
// AC5  Deleting the account erases the data and the identity; repeating it is safe.
// AC6  The Clerk webhook rejects a bad signature and a user.deleted event uses the same erase path.
// AC7  Display name is plain text, 1 to 60 characters.
// AC12 The email address is never stored; time zone is an allowed field.
describe("S1 identity and policy acceptance criteria (API boundary)", () => {
  const unexpected = vi.fn();
  const origin = "http://localhost/api/v1/me";

  const setup = () => {
    const repo = createFakeMemberRepo();
    const deletedIdentities: string[] = [];
    const identity: IdentityAdmin = { deleteUser: async (id) => void deletedIdentities.push(id) };
    const service = createMemberService({ repo, identity });
    const as = (userId: string | null) => {
      const routes = memberRoutes(createApiRoute({ getUserId: async () => userId, onUnexpected: unexpected }), () => service);
      const call = async (pending: Promise<Response>) => {
        const res = await pending;
        return { status: res.status, json: (await res.json()) as { ok: boolean; data?: Record<string, unknown>; error?: { code: string } } };
      };
      const send = (url: string, method: string, body?: unknown) =>
        new Request(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });
      return {
        me: () => call(routes.me.GET(send(origin, "GET"))),
        patch: (body: unknown) => call(routes.me.PATCH(send(origin, "PATCH", body))),
        remove: () => call(routes.me.DELETE(send(origin, "DELETE"))),
        accept: (body: unknown) => call(routes.policyAcceptance.POST(send(`${origin}/policy-acceptance`, "POST", body))),
        exportData: () => call(routes.exportData.GET(send(`${origin}/export`, "GET"))),
      };
    };
    const accepted = async (userId: string) => {
      const api = as(userId);
      await api.accept({ version: CURRENT_POLICY_VERSION, ageAttested: true });
      return api;
    };
    return { repo, service, as, accepted, deletedIdentities };
  };
  const user = () => `user_${randomUUID()}`;

  it("signed-out callers get 401 on every member endpoint and nothing is written", async () => {
    const { as, repo } = setup();
    const api = as(null);
    for (const r of [await api.me(), await api.patch({}), await api.remove(), await api.accept({}), await api.exportData()]) {
      expect(r.status).toBe(401);
    }
    expect(await repo.findProfile("anyone")).toBeNull();
  });

  it("a first sign-in creates an empty profile that has not accepted the policy", async () => {
    const { as } = setup();
    const r = await as(user()).me();
    expect(r.status).toBe(200);
    expect(profileSchema.parse(r.json.data)).toEqual({
      displayName: null,
      emailPref: false,
      timeZone: null,
      policy: { currentVersion: CURRENT_POLICY_VERSION, acceptedVersion: null, accepted: false },
    });
  });

  it("AC1 acceptance needs the 18+ attestation and the current version", async () => {
    const { as, repo } = setup();
    const id = user();
    const api = as(id);
    for (const body of [{}, { version: CURRENT_POLICY_VERSION }, { version: CURRENT_POLICY_VERSION, ageAttested: false }, { ageAttested: true }]) {
      expect((await api.accept(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect((await api.accept({ version: "1999-01-01", ageAttested: true })).status).toBe(400);
    expect((await api.accept({ version: CURRENT_POLICY_VERSION, ageAttested: true, extra: 1 })).status).toBe(400);
    expect(await repo.listAcceptances(id)).toEqual([]);

    const ok = await api.accept({ version: CURRENT_POLICY_VERSION, ageAttested: true });
    expect(ok.status).toBe(200);
    expect((ok.json.data as { policy: { accepted: boolean } }).policy.accepted).toBe(true);
    const rows = await repo.listAcceptances(id);
    expect(rows.map((r) => r.policyKind).sort()).toEqual(["privacy", "terms"]);
    expect(rows.every((r) => r.version === CURRENT_POLICY_VERSION && r.acceptedAt instanceof Date)).toBe(true);
  });

  it("AC2 an older acceptance blocks member endpoints until the current version is accepted", async () => {
    const { as, repo } = setup();
    const id = user();
    const api = as(id);
    await repo.ensureProfile(id);
    await repo.recordAcceptances(id, [
      { policyKind: "terms", version: "2025-01-01" },
      { policyKind: "privacy", version: "2025-01-01" },
    ]);
    const blocked = await api.patch({ displayName: "Sam" });
    expect(blocked.status).toBe(403);
    expect(blocked.json).toMatchObject({ ok: false, error: { code: "policy_reacceptance_required" } });
    expect((await api.me()).status).toBe(200); // reading the profile is how a client learns it must re-accept
    expect((await api.exportData()).status).toBe(200); // a member can always take their data out
    await api.accept({ version: CURRENT_POLICY_VERSION, ageAttested: true });
    expect((await api.patch({ displayName: "Sam" })).status).toBe(200);
  });

  it("AC2 accepting only one of the two policy kinds is not enough", async () => {
    const { as, repo } = setup();
    const id = user();
    await repo.ensureProfile(id);
    await repo.recordAcceptances(id, [{ policyKind: "terms", version: CURRENT_POLICY_VERSION }]);
    expect((await as(id).patch({ displayName: "Sam" })).status).toBe(403);
  });

  it("AC3 a member edits only allowed fields of their own profile", async () => {
    const { accepted, as } = setup();
    const a = await accepted(user());
    const b = await accepted(user());
    const r = await a.patch({ displayName: "  Ada  ", emailPref: true, timeZone: "America/Chicago" });
    expect(r.status).toBe(200);
    expect(r.json.data).toMatchObject({ displayName: "Ada", emailPref: true, timeZone: "America/Chicago" });
    expect((await b.me()).json.data).toMatchObject({ displayName: null, emailPref: false, timeZone: null });
    expect(as(null)).toBeDefined();
  });

  it("AC3 mass assignment is rejected: role, id and other fields cannot be set", async () => {
    const { accepted } = setup();
    const api = await accepted(user());
    for (const body of [{ role: "admin" }, { id: "x" }, { clerkUserId: "someone-else" }, { displayName: "ok", isAdmin: true }]) {
      const r = await api.patch(body);
      expect(r.status, JSON.stringify(body)).toBe(400);
    }
  });

  it("AC7 display name is plain text of 1 to 60 characters on one line", async () => {
    const { accepted } = setup();
    const api = await accepted(user());
    expect((await api.patch({ displayName: "x".repeat(DISPLAY_NAME_MAX) })).status).toBe(200);
    for (const bad of ["", "   ", "x".repeat(DISPLAY_NAME_MAX + 1), "two\nlines", `bad${String.fromCharCode(0)}name`, 7]) {
      expect((await api.patch({ displayName: bad })).status, JSON.stringify(bad)).toBe(400);
    }
    expect((await api.patch({ displayName: "<b>Sam</b>" })).json.data).toMatchObject({ displayName: "<b>Sam</b>" });
  });

  it("AC12 only a real time zone is accepted, and no email address is ever stored", async () => {
    const { accepted, repo } = setup();
    const id = user();
    const api = await accepted(id);
    expect((await api.patch({ timeZone: "Mars/Olympus" })).status).toBe(400);
    expect((await api.patch({ timeZone: "Europe/London" })).status).toBe(200);
    expect((await api.patch({ email: "a@example.com" })).status).toBe(400);
    const row = await repo.findProfile(id);
    // The only column about email is the on/off choice: the address itself is never stored.
    expect(Object.keys(row ?? {}).filter((key) => /mail/i.test(key))).toEqual(["emailPref"]);
  });

  it("AC4 the export holds the caller's data and nothing about anyone else", async () => {
    const { accepted } = setup();
    const a = await accepted(user());
    const b = await accepted(user());
    await a.patch({ displayName: "Ada Export" });
    await b.patch({ displayName: "Bea Secret" });
    const r = await a.exportData();
    expect(r.status).toBe(200);
    const parsed = dataExportSchema.parse(r.json.data);
    expect(Object.keys(parsed.data).sort()).toEqual([...MEMBER_TABLES].sort()); // one list, so a new table cannot be forgotten
    const text = JSON.stringify(parsed);
    expect(text).toContain("Ada Export");
    expect(text).not.toContain("Bea Secret");
    expect(parsed.data.policy_acceptance).toHaveLength(2);
  });

  it("AC5 deleting the account erases the data and the identity, unlinks acceptance records, and is repeatable", async () => {
    const { accepted, repo, deletedIdentities, as } = setup();
    const id = user();
    const api = await accepted(id);
    await api.patch({ displayName: "Ada" });
    const first = await api.remove();
    expect(first).toMatchObject({ status: 200, json: { ok: true, data: { deleted: true } } });
    expect(deletedIdentities).toEqual([id]);
    expect(await repo.findProfile(id)).toBeNull();
    expect(await repo.listAcceptances(id)).toEqual([]); // no longer linked to the person
    const again = await as(id).remove(); // e.g. the Clerk step failed the first time
    expect(again.status).toBe(200);
    expect(deletedIdentities).toEqual([id, id]);
  });

  it("AC5 deleting one account never touches another", async () => {
    const { accepted, repo } = setup();
    const a = await accepted(user());
    const bId = user();
    const b = await accepted(bId);
    await a.remove();
    expect(await repo.findProfile(bId)).not.toBeNull();
    expect((await b.me()).status).toBe(200);
  });

  describe("AC6 Clerk webhook", () => {
    const hook = (verify: (r: Request) => Promise<VerifiedWebhookEvent>) => {
      const { accepted, repo, service } = setup();
      const routes = clerkWebhookRoutes(createApiRoute({ getUserId: async () => null, onUnexpected: unexpected }), {
        verify,
        getService: () => service,
      });
      const post = (body = "{}") =>
        routes.POST(new Request("http://localhost/api/v1/webhooks/clerk", { method: "POST", body, headers: { "svix-id": "x" } }));
      return { accepted, repo, post };
    };

    it("rejects a missing or bad signature before changing anything", async () => {
      const { accepted, repo, post } = hook(async () => {
        throw new Error("bad signature");
      });
      const id = user();
      await accepted(id);
      const res = await post();
      expect(res.status).toBe(400);
      expect(await res.json()).toMatchObject({ ok: false, error: { code: "validation_failed" } });
      expect(await repo.findProfile(id)).not.toBeNull();
    });

    it("a verified user.deleted event erases that user's data (same path as account deletion)", async () => {
      const id = user();
      const other = user();
      const { accepted, repo, post } = hook(async () => ({ type: "user.deleted", userId: id }));
      await accepted(id);
      await accepted(other);
      expect((await post()).status).toBe(200);
      expect(await repo.findProfile(id)).toBeNull();
      expect(await repo.findProfile(other)).not.toBeNull();
      expect((await post()).status).toBe(200); // a repeat finds nothing and still succeeds
    });

    it("other event types are acknowledged and change nothing", async () => {
      const id = user();
      const { accepted, repo, post } = hook(async () => ({ type: "user.updated", userId: id }));
      await accepted(id);
      expect((await post()).status).toBe(200);
      expect(await repo.findProfile(id)).not.toBeNull();
    });
  });

  it("responses use the standard envelope and unexpected failures are a generic 500", async () => {
    const repo = createFakeMemberRepo();
    const broken = { ...repo, ensureProfile: async () => Promise.reject(new Error("db password is hunter2")) };
    const service = createMemberService({ repo: broken, identity: { deleteUser: async () => {} } });
    const routes = memberRoutes(createApiRoute({ getUserId: async () => "user_1", onUnexpected: unexpected }), () => service);
    unexpected.mockClear();
    const res = await routes.me.GET(new Request(origin));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(resultSchema(profileSchema).safeParse(body).success).toBe(true);
    expect(JSON.stringify(body)).not.toMatch(/hunter2|password/);
    expect(unexpected).toHaveBeenCalledTimes(1);
  });
});
