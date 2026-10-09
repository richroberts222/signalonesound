import { assertDestructiveAllowed, parseDatabaseEnv } from "@signalone/shared";
import { inArray, like } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { DatabaseError } from "./errors";
import { createMemberRepo } from "./member";
import { createOrganizationsRepo } from "./organizations";
import { auditLog, organization, organizationLink, organizationMember, userProfile } from "./schema";

// Database-backed integration tests for organizations, claims, decisions and account deletion (S2,
// /docs/automation/integration.md). They run ONLY via `pnpm --filter web test:integration`, never in
// `pnpm test`, and are fail-closed: DATABASE_ENV must be explicitly `dev` or `qa`; STAGE and PROD are
// refused. The migrations must already be applied (`pnpm --filter web db:migrate -- --env=dev`).
const config = parseDatabaseEnv(process.env);
assertDestructiveAllowed(config.databaseEnv, ["dev", "qa"], "test:integration");
if (process.env.APP_ENV && process.env.APP_ENV !== config.databaseEnv) {
  throw new Error("test:integration: APP_ENV must equal DATABASE_ENV; refusing.");
}
if (process.env.VERCEL_ENV) throw new Error("test:integration: must not run on Vercel; refusing.");

const db = createDb(config.databaseUrl);
const orgs = createOrganizationsRepo(db);
const members = createMemberRepo(db);
const PREFIX = "itest-s2-";
const users = new Set<string>();
const orgIds = new Set<string>();

const newUser = () => {
  const id = `user_${PREFIX}${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
  users.add(id);
  return id;
};
const claim = async (userId: string, name = `${PREFIX}${crypto.randomUUID()}`, existingOrgId: string | null = null) => {
  const r = await orgs.createClaim({
    existingOrgId,
    name,
    nameKey: name.toLowerCase(),
    description: "integration test",
    links: ["https://integration.example"],
    userId,
    contactEmail: "test@integration.example",
  });
  orgIds.add(r.organizationId);
  return { ...r, name };
};

afterAll(async () => {
  // Test cleanup only: application code never deletes audit entries (the log is append-only).
  const ids = [...orgIds];
  if (ids.length > 0) {
    await db.delete(organizationMember).where(inArray(organizationMember.orgId, ids));
    await db.delete(organizationLink).where(inArray(organizationLink.orgId, ids));
    await db.delete(organization).where(inArray(organization.id, ids));
  }
  await db.delete(auditLog).where(like(auditLog.subject, `%${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `%${PREFIX}%`));
  await db.delete(userProfile).where(inArray(userProfile.clerkUserId, [...users]));
});

describe("organizations against the real database", () => {
  it("creates an organization with its links and a pending claim, found by lower-cased name", async () => {
    const user = newUser();
    const { organizationId, name } = await claim(user);
    const org = await orgs.getWithLinks(organizationId);
    expect(org).toMatchObject({ name, status: "pending", links: ["https://integration.example"] });
    expect((await orgs.findByNameKey(name.toLowerCase()))?.id).toBe(organizationId);
    expect(await orgs.findOpenMembership(organizationId, user)).toMatchObject({ status: "pending", role: "manager" });
  });

  it("refuses a second open claim by the same person for the same organization", async () => {
    const user = newUser();
    const first = await claim(user);
    await expect(claim(user, first.name, first.organizationId)).rejects.toMatchObject({ kind: "unique_violation" });
    expect(DatabaseError).toBeDefined();
  });

  it("an approval makes a manager, publishes the organization, removes the contact email and writes the audit entry once", async () => {
    const user = newUser();
    const admin = newUser();
    const { organizationId, requestId } = await claim(user);
    const decided = await orgs.decide({ requestId, orgId: organizationId, decision: "approve", reason: "itest", actorId: admin, requesterId: user });
    expect(decided).toBe(true);
    expect((await orgs.getWithLinks(organizationId))?.status).toBe("approved");
    expect(await orgs.isApprovedManager(organizationId, user)).toBe(true);
    expect(await orgs.getRequest(requestId)).toMatchObject({ status: "approved", contactEmail: null, decidedBy: admin });
    expect(await orgs.decide({ requestId, orgId: organizationId, decision: "reject", reason: "again", actorId: admin, requesterId: user })).toBe(false);
    const entries = (await orgs.listAudit(500)).filter((a) => a.subject.includes(organizationId));
    expect(entries.filter((a) => a.action === "manager_request.approve")).toHaveLength(1);
  });

  it("revoking the only approved manager sends the organization back to pending", async () => {
    const user = newUser();
    const admin = newUser();
    const { organizationId, requestId } = await claim(user);
    await orgs.decide({ requestId, orgId: organizationId, decision: "approve", reason: "itest", actorId: admin, requesterId: user });
    expect(await orgs.revoke({ orgId: organizationId, userId: user, actorId: admin, reason: "itest" })).toBe(true);
    expect(await orgs.isApprovedManager(organizationId, user)).toBe(false);
    expect((await orgs.getWithLinks(organizationId))?.status).toBe("pending");
    expect(await orgs.revoke({ orgId: organizationId, userId: user, actorId: admin, reason: "again" })).toBe(false);
  });

  it("AC13 deleting the account of the only approved manager leaves the organization pending and unlinks the audit log", async () => {
    const manager = newUser();
    const admin = newUser();
    const { organizationId, requestId } = await claim(manager);
    await orgs.decide({ requestId, orgId: organizationId, decision: "approve", reason: "itest", actorId: admin, requesterId: manager });
    await orgs.updateOrganization(organizationId, { description: "edited by the manager" }, manager);

    await members.eraseAll(manager);

    expect(await orgs.findOpenMembership(organizationId, manager)).toBeNull();
    expect((await orgs.getWithLinks(organizationId))?.status).toBe("pending");
    const exported = await members.exportAll(manager);
    expect(exported.organization_member).toEqual([]);
    expect(exported.audit_log).toEqual([]);
    const entries = (await orgs.listAudit(500)).filter((a) => a.subject.includes(organizationId));
    expect(entries.length).toBeGreaterThan(0);
    expect(JSON.stringify(entries)).not.toContain(manager); // the person is gone from the audit log
    expect(entries.some((a) => a.actorId.startsWith("deleted:"))).toBe(true);
  });

  it("AC13 deleting one of two approved managers keeps the organization approved", async () => {
    const first = newUser();
    const second = newUser();
    const admin = newUser();
    const a = await claim(first);
    await orgs.decide({ requestId: a.requestId, orgId: a.organizationId, decision: "approve", reason: "itest", actorId: admin, requesterId: first });
    const b = await claim(second, a.name, a.organizationId);
    await orgs.decide({ requestId: b.requestId, orgId: a.organizationId, decision: "approve", reason: "itest", actorId: admin, requesterId: second });

    await members.eraseAll(first);

    expect((await orgs.getWithLinks(a.organizationId))?.status).toBe("approved");
    expect(await orgs.isApprovedManager(a.organizationId, second)).toBe(true);
  });
});
