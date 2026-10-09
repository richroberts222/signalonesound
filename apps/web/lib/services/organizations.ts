import {
  MAX_CLAIMS_PER_DAY,
  type AdminRequests,
  type AuditLog,
  type ClaimOrganizationInput,
  type ClaimResult,
  type DecideRequestInput,
  type DecisionResult,
  type MembershipStatus,
  type MyOrganizations,
  type OrgStatus,
  type PatchOrganizationInput,
  type PublicOrganization,
  type RevokeInput,
} from "@signalone/validation";

import type { OrgWithLinks, OrganizationsRepo } from "../../db/organizations";
import type { ServiceContext } from "./context";
import { conflict, notFound, rateLimited } from "./errors";

// Service for Church/Ministry organizations, claims and manager roles (S2,
// docs/features/s2-organizations-and-roles.md, docs/permissions.md). Rules, all checked on the
// server on every request and against the specific organization:
//   * a person never chooses their own role: a claim creates a pending request and only a platform
//     admin's decision creates a manager;
//   * deny by default, and an outsider is told "not found" rather than "forbidden" so the existence
//     of an organization or a request is not revealed;
//   * every role change is written to the append-only audit log in the same atomic step.
// Framework-free; the repo, the admin directory and the policy check are injected.

/** Who the platform admins are: configuration, not code (docs/permissions.md rule 8). */
export type AdminDirectory = { isAdmin(userId: string): boolean };

export type OrganizationsServiceDeps = {
  repo: OrganizationsRepo;
  admins: AdminDirectory;
  /** Throws `policy_reacceptance_required` unless the caller accepted the current policy (S1). */
  requireAccepted: (userId: string) => Promise<void>;
  now?: () => Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const nameKeyOf = (name: string): string => name.trim().replace(/\s+/g, " ").toLowerCase();

const toPublic = (org: OrgWithLinks): PublicOrganization => ({
  id: org.id,
  name: org.name,
  description: org.description,
  links: org.links,
  status: org.status as OrgStatus,
});

export function createOrganizationsService({ repo, admins, requireAccepted, now = () => new Date() }: OrganizationsServiceDeps) {
  const requireAdmin = (ctx: ServiceContext): void => {
    // Admin endpoints answer "not found" to everyone else, so they cannot be probed.
    if (!admins.isAdmin(ctx.actor.userId)) throw notFound();
  };
  const mayManage = async (ctx: ServiceContext, orgId: string): Promise<boolean> =>
    admins.isAdmin(ctx.actor.userId) || (await repo.isApprovedManager(orgId, ctx.actor.userId));

  return {
    /** Submits a claim on a Church/Ministry. Gives no rights until an admin approves it. */
    async claim(ctx: ServiceContext, input: ClaimOrganizationInput): Promise<ClaimResult> {
      const userId = ctx.actor.userId;
      await requireAccepted(userId);
      if ((await repo.countClaimsSince(userId, new Date(now().getTime() - DAY_MS))) >= MAX_CLAIMS_PER_DAY) throw rateLimited();

      const existing = await repo.findByNameKey(nameKeyOf(input.name));
      if (existing && (await repo.findOpenMembership(existing.id, userId))) {
        throw conflict("You already have a request for this organization");
      }
      const { organizationId, requestId } = await repo.createClaim({
        existingOrgId: existing?.id ?? null,
        name: input.name,
        nameKey: nameKeyOf(input.name),
        description: input.description,
        links: input.links,
        userId,
        contactEmail: input.contactEmail,
      });
      return { organizationId, requestId, status: "pending" };
    },

    /** The public view: approved organizations only, and only the public fields. */
    async getPublic(id: string): Promise<PublicOrganization> {
      const org = await repo.getWithLinks(id);
      if (!org || org.status !== "approved") throw notFound();
      return toPublic(org);
    },

    /** The caller's own organizations and their standing in each. */
    async listMine(ctx: ServiceContext): Promise<MyOrganizations> {
      const rows = await repo.listMine(ctx.actor.userId);
      return { items: rows.map(({ org, membership }) => ({ ...toPublic(org), membership: membership.status as MembershipStatus })) };
    },

    /** A manager (or an admin) edits name, description and links. Anyone else: not found. */
    async update(ctx: ServiceContext, id: string, patch: PatchOrganizationInput): Promise<PublicOrganization> {
      await requireAccepted(ctx.actor.userId);
      if (!(await mayManage(ctx, id))) throw notFound();
      await repo.updateOrganization(
        id,
        {
          ...(patch.name !== undefined ? { name: patch.name, nameKey: nameKeyOf(patch.name) } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.links !== undefined ? { links: patch.links } : {}),
        },
        ctx.actor.userId,
      );
      const org = await repo.getWithLinks(id);
      if (!org) throw notFound();
      return toPublic(org);
    },

    /** Admin: the claims waiting for a decision, oldest first. */
    async listRequests(ctx: ServiceContext): Promise<AdminRequests> {
      requireAdmin(ctx);
      const pending = await repo.listPending();
      return {
        items: pending.map(({ request, org, otherPending }) => ({
          id: request.id,
          requesterId: request.userId,
          contactEmail: request.contactEmail,
          requestedAt: request.requestedAt.toISOString(),
          organization: { ...toPublic(org), otherPendingClaims: otherPending },
        })),
      };
    },

    /** Admin: approve or reject a claim, with a reason. A decision is final and cannot be repeated. */
    async decide(ctx: ServiceContext, requestId: string, input: DecideRequestInput): Promise<DecisionResult> {
      requireAdmin(ctx);
      const request = await repo.getRequest(requestId);
      if (!request) throw notFound();
      if (request.status !== "pending") throw conflict("This request has already been decided");
      const decided = await repo.decide({
        requestId,
        orgId: request.orgId,
        decision: input.decision,
        reason: input.reason,
        actorId: ctx.actor.userId,
        requesterId: request.userId,
      });
      if (!decided) throw conflict("This request has already been decided");
      return { id: requestId, status: input.decision === "approve" ? "approved" : "rejected" };
    },

    /** An admin or one of the organization's managers removes a manager. Takes effect immediately. */
    async revoke(ctx: ServiceContext, orgId: string, userId: string, input: RevokeInput): Promise<DecisionResult> {
      if (!(await mayManage(ctx, orgId))) throw notFound();
      const revoked = await repo.revoke({ orgId, userId, actorId: ctx.actor.userId, reason: input.reason });
      if (!revoked) throw notFound();
      return { id: orgId, status: "revoked" };
    },

    /** Admin: the audit log, newest first. There is no way to change or delete an entry. */
    async listAudit(ctx: ServiceContext): Promise<AuditLog> {
      requireAdmin(ctx);
      const rows = await repo.listAudit();
      return {
        items: rows.map((row) => ({
          id: row.id,
          actorId: row.actorId,
          action: row.action,
          subject: row.subject,
          at: row.at.toISOString(),
          detail: row.detail,
        })),
      };
    },
  };
}

export type OrganizationsService = ReturnType<typeof createOrganizationsService>;
