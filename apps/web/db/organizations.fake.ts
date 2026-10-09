import { randomUUID } from "node:crypto";

import { DatabaseError } from "./errors";
import type { AuditRow, MemberRow, OrgRow, OrgWithLinks, OrganizationsRepo } from "./organizations";

// Test-only in-memory stand-in for the organizations repo. It mimics what the service relies on: a
// unique lower-cased name, at most one open (pending or approved) claim per person and organization,
// atomic decisions, an append-only audit log, and the contact email removed on decision. Never used
// in application code.
export function createFakeOrganizationsRepo(now: () => Date = () => new Date()): OrganizationsRepo {
  const orgs = new Map<string, OrgRow>();
  const links = new Map<string, string[]>();
  const members: MemberRow[] = [];
  const audit: AuditRow[] = [];
  const open = (m: MemberRow) => m.status === "pending" || m.status === "approved";
  const withLinks = (o: OrgRow): OrgWithLinks => ({ ...o, links: [...(links.get(o.id) ?? [])] });
  const unique = (op: string) => new DatabaseError("unique_violation", op, new Error("duplicate"));
  const log = (actorId: string, action: string, subject: string, detail = "") =>
    audit.push({ id: randomUUID(), actorId, action, subject, detail, at: now() });

  return {
    async findByNameKey(nameKey) {
      const row = [...orgs.values()].find((o) => o.nameKey === nameKey);
      return row ? { ...row } : null;
    },
    async getWithLinks(id) {
      const row = orgs.get(id);
      return row ? withLinks(row) : null;
    },
    async findOpenMembership(orgId, userId) {
      const row = members.find((m) => m.orgId === orgId && m.userId === userId && open(m));
      return row ? { ...row } : null;
    },
    async countClaimsSince(userId, since) {
      return members.filter((m) => m.userId === userId && m.requestedAt >= since).length;
    },
    async createClaim(input) {
      const requestId = randomUUID();
      let organizationId = input.existingOrgId;
      if (organizationId) {
        if (members.some((m) => m.orgId === organizationId && m.userId === input.userId && open(m))) throw unique("org.createClaim");
      } else {
        if ([...orgs.values()].some((o) => o.nameKey === input.nameKey)) throw unique("org.createClaim");
        organizationId = randomUUID();
        orgs.set(organizationId, {
          id: organizationId,
          name: input.name,
          nameKey: input.nameKey,
          description: input.description,
          status: "pending",
          createdAt: now(),
        });
        links.set(organizationId, [...input.links]);
      }
      members.push({
        id: requestId,
        orgId: organizationId,
        userId: input.userId,
        role: "manager",
        status: "pending",
        contactEmail: input.contactEmail,
        requestedAt: now(),
        decidedAt: null,
        decidedBy: null,
        decisionReason: null,
      });
      return { organizationId, requestId };
    },
    async listMine(userId) {
      return members
        .filter((m) => m.userId === userId)
        .flatMap((membership) => {
          const org = orgs.get(membership.orgId);
          return org ? [{ org: withLinks(org), membership: { ...membership } }] : [];
        });
    },
    async isApprovedManager(orgId, userId) {
      return members.some((m) => m.orgId === orgId && m.userId === userId && m.status === "approved");
    },
    async getRequest(id) {
      const row = members.find((m) => m.id === id);
      return row ? { ...row } : null;
    },
    async listPending() {
      return members
        .filter((m) => m.status === "pending")
        .flatMap((request) => {
          const org = orgs.get(request.orgId);
          if (!org) return [];
          const otherPending = members.filter((m) => m.status === "pending" && m.orgId === request.orgId && m.id !== request.id).length;
          return [{ request: { ...request }, org: withLinks(org), otherPending }];
        });
    },
    async decide(input) {
      const request = members.find((m) => m.id === input.requestId);
      if (!request || request.status !== "pending") return false;
      request.status = input.decision === "approve" ? "approved" : "rejected";
      request.decidedAt = now();
      request.decidedBy = input.actorId;
      request.decisionReason = input.reason;
      request.contactEmail = null;
      const org = orgs.get(input.orgId);
      if (org && org.status === "pending" && request.status === "approved") org.status = "approved";
      log(input.actorId, `manager_request.${input.decision}`, `organization:${input.orgId}; member:${input.requesterId}`, input.reason);
      return true;
    },
    async revoke(input) {
      const member = members.find((m) => m.orgId === input.orgId && m.userId === input.userId && m.status === "approved");
      if (!member) return false;
      member.status = "revoked";
      member.decidedAt = now();
      member.decidedBy = input.actorId;
      member.decisionReason = input.reason;
      const org = orgs.get(input.orgId);
      if (org && org.status === "approved" && !members.some((m) => m.orgId === input.orgId && m.status === "approved")) org.status = "pending";
      log(input.actorId, "manager.revoke", `organization:${input.orgId}; member:${input.userId}`, input.reason);
      return true;
    },
    async updateOrganization(id, patch, actorId) {
      const org = orgs.get(id);
      if (!org) return;
      if (patch.nameKey !== undefined && [...orgs.values()].some((o) => o.id !== id && o.nameKey === patch.nameKey)) throw unique("org.update");
      if (patch.name !== undefined && patch.nameKey !== undefined) {
        org.name = patch.name;
        org.nameKey = patch.nameKey;
      }
      if (patch.description !== undefined) org.description = patch.description;
      if (patch.links) links.set(id, [...patch.links]);
      log(actorId, "organization.update", `organization:${id}`, Object.keys(patch).join(","));
    },
    async listAudit(limit = 200) {
      return [...audit].reverse().slice(0, limit).map((a) => ({ ...a }));
    },
    async appendAudit(entry) {
      log(entry.actorId, entry.action, entry.subject, entry.detail ?? "");
    },
  };
}
