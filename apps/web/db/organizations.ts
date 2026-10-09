import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gte, inArray, sql } from "drizzle-orm";

import type { Database } from "./client";
import { withDbErrors } from "./errors";
import { auditLog, organization, organizationLink, organizationMember } from "./schema";

// Data access for organizations, claims, roles and the audit log (S2,
// docs/features/s2-organizations-and-roles.md). Server-only by convention (like all of db/): it owns
// the Drizzle queries and DatabaseError wrapping, and returns its own row types that the service maps
// to the public contracts. Multi-step changes use one atomic batch (the driver has no interactive
// transactions, docs/database.md section 18).
export type OrgRow = typeof organization.$inferSelect;
export type MemberRow = typeof organizationMember.$inferSelect;
export type AuditRow = typeof auditLog.$inferSelect;
export type OrgWithLinks = OrgRow & { links: string[] };
export type PendingRequest = { request: MemberRow; org: OrgWithLinks; otherPending: number };
export type AuditEntry = { actorId: string; action: string; subject: string; detail?: string };

export type OrganizationsRepo = ReturnType<typeof createOrganizationsRepo>;

export function createOrganizationsRepo(db: Database) {
  async function linksFor(orgIds: string[]): Promise<Map<string, string[]>> {
    const byOrg = new Map<string, string[]>();
    if (orgIds.length === 0) return byOrg;
    const rows = await db
      .select()
      .from(organizationLink)
      .where(inArray(organizationLink.orgId, orgIds))
      .orderBy(asc(organizationLink.position));
    for (const row of rows) byOrg.set(row.orgId, [...(byOrg.get(row.orgId) ?? []), row.url]);
    return byOrg;
  }

  async function withLinks(orgs: OrgRow[]): Promise<OrgWithLinks[]> {
    const links = await linksFor(orgs.map((o) => o.id));
    return orgs.map((o) => ({ ...o, links: links.get(o.id) ?? [] }));
  }

  return {
    findByNameKey: (nameKey: string): Promise<OrgRow | null> =>
      withDbErrors("org.findByNameKey", async () => {
        const [row] = await db.select().from(organization).where(eq(organization.nameKey, nameKey)).limit(1);
        return row ?? null;
      }),

    getWithLinks: (id: string): Promise<OrgWithLinks | null> =>
      withDbErrors("org.getWithLinks", async () => {
        const [row] = await db.select().from(organization).where(eq(organization.id, id)).limit(1);
        return row ? (await withLinks([row]))[0] : null;
      }),

    findOpenMembership: (orgId: string, userId: string): Promise<MemberRow | null> =>
      withDbErrors("org.findOpenMembership", async () => {
        const [row] = await db
          .select()
          .from(organizationMember)
          .where(and(eq(organizationMember.orgId, orgId), eq(organizationMember.userId, userId), inArray(organizationMember.status, ["pending", "approved"])))
          .limit(1);
        return row ?? null;
      }),

    countClaimsSince: (userId: string, since: Date): Promise<number> =>
      withDbErrors("org.countClaimsSince", async () => {
        const [row] = await db
          .select({ n: count() })
          .from(organizationMember)
          .where(and(eq(organizationMember.userId, userId), gte(organizationMember.requestedAt, since)));
        return Number(row?.n ?? 0);
      }),

    /**
     * Creates a claim in one atomic step. For a new organization it also creates the organization and
     * its links; for an existing one (same name) it only adds the request. A second open claim by the
     * same person for the same organization is a unique violation (409).
     */
    createClaim: (input: {
      existingOrgId: string | null;
      name: string;
      nameKey: string;
      description: string;
      links: string[];
      userId: string;
      contactEmail: string;
    }): Promise<{ organizationId: string; requestId: string }> =>
      withDbErrors("org.createClaim", async () => {
        const requestId = randomUUID();
        const member = db.insert(organizationMember).values({
          id: requestId,
          orgId: input.existingOrgId ?? "",
          userId: input.userId,
          contactEmail: input.contactEmail,
        });
        if (input.existingOrgId) {
          await member;
          return { organizationId: input.existingOrgId, requestId };
        }
        const organizationId = randomUUID();
        await db.batch([
          db.insert(organization).values({ id: organizationId, name: input.name, nameKey: input.nameKey, description: input.description }),
          db.insert(organizationLink).values(input.links.map((url, position) => ({ orgId: organizationId, url, position }))),
          db.insert(organizationMember).values({ id: requestId, orgId: organizationId, userId: input.userId, contactEmail: input.contactEmail }),
        ]);
        return { organizationId, requestId };
      }),

    listMine: (userId: string): Promise<{ org: OrgWithLinks; membership: MemberRow }[]> =>
      withDbErrors("org.listMine", async () => {
        const memberships = await db
          .select()
          .from(organizationMember)
          .where(eq(organizationMember.userId, userId))
          .orderBy(desc(organizationMember.requestedAt));
        const orgs = await withLinks(
          memberships.length === 0
            ? []
            : await db.select().from(organization).where(inArray(organization.id, [...new Set(memberships.map((m) => m.orgId))])),
        );
        const byId = new Map(orgs.map((o) => [o.id, o]));
        return memberships.flatMap((membership) => {
          const org = byId.get(membership.orgId);
          return org ? [{ org, membership }] : [];
        });
      }),

    isApprovedManager: (orgId: string, userId: string): Promise<boolean> =>
      withDbErrors("org.isApprovedManager", async () => {
        const [row] = await db
          .select({ id: organizationMember.id })
          .from(organizationMember)
          .where(and(eq(organizationMember.orgId, orgId), eq(organizationMember.userId, userId), eq(organizationMember.status, "approved")))
          .limit(1);
        return row !== undefined;
      }),

    getRequest: (id: string): Promise<MemberRow | null> =>
      withDbErrors("org.getRequest", async () => {
        const [row] = await db.select().from(organizationMember).where(eq(organizationMember.id, id)).limit(1);
        return row ?? null;
      }),

    listPending: (): Promise<PendingRequest[]> =>
      withDbErrors("org.listPending", async () => {
        const requests = await db
          .select()
          .from(organizationMember)
          .where(eq(organizationMember.status, "pending"))
          .orderBy(asc(organizationMember.requestedAt));
        if (requests.length === 0) return [];
        const orgIds = [...new Set(requests.map((r) => r.orgId))];
        const orgs = await withLinks(await db.select().from(organization).where(inArray(organization.id, orgIds)));
        const byId = new Map(orgs.map((o) => [o.id, o]));
        return requests.flatMap((request) => {
          const org = byId.get(request.orgId);
          if (!org) return [];
          return [{ request, org, otherPending: requests.filter((r) => r.orgId === request.orgId && r.id !== request.id).length }];
        });
      }),

    /**
     * Records an admin decision atomically: the request, the organization status (an approval makes a
     * pending organization approved), the removal of the contact email, and the audit entry.
     * Returns false when the request was no longer pending.
     */
    decide: (input: { requestId: string; orgId: string; decision: "approve" | "reject"; reason: string; actorId: string; requesterId: string }): Promise<boolean> =>
      withDbErrors("org.decide", async () => {
        const status = input.decision === "approve" ? "approved" : "rejected";
        const results = await db.batch([
          db
            .update(organizationMember)
            .set({ status, decidedAt: new Date(), decidedBy: input.actorId, decisionReason: input.reason, contactEmail: null })
            .where(and(eq(organizationMember.id, input.requestId), eq(organizationMember.status, "pending")))
            .returning({ id: organizationMember.id }),
          db
            .update(organization)
            .set({ status: "approved" })
            .where(
              and(
                eq(organization.id, input.orgId),
                eq(organization.status, "pending"),
                sql`exists (select 1 from organization_member where id = ${input.requestId} and status = 'approved')`,
              ),
            ),
          db.insert(auditLog).values({
            actorId: input.actorId,
            action: `manager_request.${input.decision}`,
            subject: `organization:${input.orgId}; member:${input.requesterId}`,
            detail: input.reason,
          }),
        ]);
        return (results[0] as unknown[]).length > 0;
      }),

    /** Revokes an approved manager; an organization left with no approved manager goes back to pending. */
    revoke: (input: { orgId: string; userId: string; actorId: string; reason: string }): Promise<boolean> =>
      withDbErrors("org.revoke", async () => {
        const results = await db.batch([
          db
            .update(organizationMember)
            .set({ status: "revoked", decidedAt: new Date(), decidedBy: input.actorId, decisionReason: input.reason })
            .where(and(eq(organizationMember.orgId, input.orgId), eq(organizationMember.userId, input.userId), eq(organizationMember.status, "approved")))
            .returning({ id: organizationMember.id }),
          db
            .update(organization)
            .set({ status: "pending" })
            .where(
              and(
                eq(organization.id, input.orgId),
                eq(organization.status, "approved"),
                sql`not exists (select 1 from organization_member where org_id = ${input.orgId} and status = 'approved')`,
              ),
            ),
          db.insert(auditLog).values({
            actorId: input.actorId,
            action: "manager.revoke",
            subject: `organization:${input.orgId}; member:${input.userId}`,
            detail: input.reason,
          }),
        ]);
        return (results[0] as unknown[]).length > 0;
      }),

    updateOrganization: (
      id: string,
      patch: { name?: string; nameKey?: string; description?: string; links?: string[] },
      actorId: string,
    ): Promise<void> =>
      withDbErrors("org.update", async () => {
        const fields: Partial<typeof organization.$inferInsert> = {};
        if (patch.name !== undefined && patch.nameKey !== undefined) {
          fields.name = patch.name;
          fields.nameKey = patch.nameKey;
        }
        if (patch.description !== undefined) fields.description = patch.description;
        const audit = db.insert(auditLog).values({ actorId, action: "organization.update", subject: `organization:${id}`, detail: Object.keys(patch).join(",") });
        if (patch.links) {
          await db.batch([
            ...(Object.keys(fields).length > 0 ? [db.update(organization).set(fields).where(eq(organization.id, id))] : []),
            db.delete(organizationLink).where(eq(organizationLink.orgId, id)),
            db.insert(organizationLink).values(patch.links.map((url, position) => ({ orgId: id, url, position }))),
            audit,
          ] as unknown as Parameters<Database["batch"]>[0]);
        } else if (Object.keys(fields).length > 0) {
          await db.batch([db.update(organization).set(fields).where(eq(organization.id, id)), audit]);
        } else {
          await audit;
        }
      }),

    listAudit: (limit = 200): Promise<AuditRow[]> =>
      withDbErrors("org.listAudit", () => db.select().from(auditLog).orderBy(desc(auditLog.at)).limit(limit)),

    appendAudit: (entry: AuditEntry): Promise<void> =>
      withDbErrors("org.appendAudit", async () => {
        await db.insert(auditLog).values({ ...entry, detail: entry.detail ?? "" });
      }),
  };
}
