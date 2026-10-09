import { createHmac } from "node:crypto";
import {
  MAX_REPORTS_PER_ADDRESS_PER_DAY,
  type AuditQuery,
  type CreateReportInput,
  type ModerationReasonInput,
  type ModerationResult,
  type Overview,
  type ReportDecisionInput,
  type ReportList,
  type SuspendMemberInput,
  type AuditLog,
} from "@signalone/validation";

import type { ModerationRepo } from "../../db/moderation";
import type { EmailLookup, EmailPort } from "../messaging/email";
import type { ServiceContext } from "./context";
import { conflict, notFound, rateLimited } from "./errors";
import type { AdminDirectory } from "./organizations";

// Service for reports and admin moderation (S8, docs/features/s8-admin-and-moderation.md). Rules:
//   * anyone may report; a report never records who reported, and the address that sent it is kept
//     only as a keyed hash for 24 hours, to stop one address flooding the form;
//   * every admin action is admin-only (everyone else is told "not found"), needs a reason, is
//     recorded in the audit log in the same atomic step as the change, and cannot be repeated (409);
//   * the people affected are told by email what happened, why, and how to appeal, with no one else's
//     details. A failing email never undoes the action.
// Framework-free; the repo, the email ports and the clock are injected.

export type ModerationServiceDeps = {
  repo: ModerationRepo;
  admins: AdminDirectory;
  email: EmailPort;
  emails: EmailLookup;
  /** Key for hashing network addresses; any value of at least 16 characters. */
  addressSalt: string;
  /** Told when an event is hidden (so people who saved it hear). A failure here never fails the action. */
  onEventHidden?: (eventId: string) => Promise<void>;
  now?: () => Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const APPEAL = "To appeal this decision, use the contact page on the Signal One Sound website.";

export function createModerationService({ repo, admins, email, emails, addressSalt, onEventHidden = async () => {}, now = () => new Date() }: ModerationServiceDeps) {
  const requireAdmin = (ctx: ServiceContext): void => {
    if (!admins.isAdmin(ctx.actor.userId)) throw notFound(); // admin tools do not reveal themselves
  };

  /** Tells people what happened. A message that cannot be sent never undoes the action. */
  async function notify(userIds: string[], subject: string, what: string, reason: string): Promise<void> {
    await Promise.all(
      [...new Set(userIds)].map(async (userId) => {
        try {
          const to = await emails.getPrimaryEmail(userId);
          if (to) await email.send({ to, subject, text: `${what}\n\nReason given: ${reason}\n\n${APPEAL}` });
        } catch {
          // ignored on purpose
        }
      }),
    );
  }

  const subjectOf = (kind: string, id: string) => `${kind}:${id}`;

  return {
    /** Anyone may report an event or a church. Not signed in, no identity kept, rate limited by address. */
    async report(input: CreateReportInput, address: string | null): Promise<{ received: true }> {
      if (!(await repo.subjectExists(input.subjectType, input.subjectId))) throw notFound();
      const addressHash = createHmac("sha256", addressSalt).update(address ?? "unknown").digest("hex");
      const accepted = await repo.recordReport({
        subjectType: input.subjectType,
        subjectId: input.subjectId,
        reason: input.reason,
        details: input.details ?? "",
        addressHash,
        maxPerWindow: MAX_REPORTS_PER_ADDRESS_PER_DAY,
        since: new Date(now().getTime() - DAY_MS),
      });
      if (!accepted) throw rateLimited("You have sent the most reports allowed today. Please try again tomorrow.");
      return { received: true };
    },

    /** The retention job: report limit records older than a day. */
    async purgeRateLimits(): Promise<number> {
      return repo.purgeRateLimits(new Date(now().getTime() - DAY_MS));
    },

    async overview(ctx: ServiceContext): Promise<Overview> {
      requireAdmin(ctx);
      return repo.overview();
    },

    async listReports(ctx: ServiceContext, status: "open" | "dismissed" | "actioned"): Promise<ReportList> {
      requireAdmin(ctx);
      const rows = await repo.listReports(status);
      return {
        items: rows.map((r) => ({
          id: r.id,
          subjectType: r.subjectType as "event" | "organization",
          subjectId: r.subjectId,
          subjectTitle: r.subjectTitle,
          reason: r.reason,
          details: r.details,
          status: r.status as "open" | "dismissed" | "actioned",
          createdAt: r.createdAt.toISOString(),
        })),
      };
    },

    /** Dismiss a report or mark it acted on. A report is decided once. */
    async decideReport(ctx: ServiceContext, id: string, input: ReportDecisionInput): Promise<ModerationResult> {
      requireAdmin(ctx);
      const found = await repo.getReport(id);
      if (!found) throw notFound();
      if (found.status !== "open") throw conflict("This report has already been decided");
      const decision = input.decision === "dismiss" ? "dismissed" : "actioned";
      const done = await repo.decideReport({ id, decision, reason: input.reason, actorId: ctx.actor.userId, subject: subjectOf(found.subjectType, found.subjectId) });
      if (!done) throw conflict("This report has already been decided");
      return { id, state: decision };
    },

    async hideEvent(ctx: ServiceContext, id: string, input: ModerationReasonInput): Promise<ModerationResult> {
      return this.moderateEvent(ctx, id, input, "published", "hidden", "event.hide");
    },

    async restoreEvent(ctx: ServiceContext, id: string, input: ModerationReasonInput): Promise<ModerationResult> {
      return this.moderateEvent(ctx, id, input, "hidden", "published", "event.restore");
    },

    async moderateEvent(ctx: ServiceContext, id: string, input: ModerationReasonInput, from: string, to: string, action: string): Promise<ModerationResult> {
      requireAdmin(ctx);
      const state = await repo.getEventState(id);
      if (state === null) throw notFound();
      if (state !== from) throw conflict(`This event is already ${to === "hidden" ? "hidden" : "visible"}`);
      const changed = await repo.setEventModeration({ id, from, to, action, reason: input.reason, actorId: ctx.actor.userId, subject: subjectOf("event", id) });
      if (!changed) throw conflict("This event has already been changed");
      if (to === "hidden") {
        await onEventHidden(id);
        await notify(await repo.managerIdsOfEvent(id), "One of your events was hidden", "An event of your church or ministry was hidden from public view by a platform admin.", input.reason);
      }
      return { id, state: to };
    },

    async unpublishOrganization(ctx: ServiceContext, id: string, input: ModerationReasonInput): Promise<ModerationResult> {
      return this.moderateOrganization(ctx, id, input, "approved", "unpublished", "organization.unpublish");
    },

    async restoreOrganization(ctx: ServiceContext, id: string, input: ModerationReasonInput): Promise<ModerationResult> {
      return this.moderateOrganization(ctx, id, input, "unpublished", "approved", "organization.restore");
    },

    async moderateOrganization(ctx: ServiceContext, id: string, input: ModerationReasonInput, from: string, to: string, action: string): Promise<ModerationResult> {
      requireAdmin(ctx);
      const status = await repo.getOrganizationStatus(id);
      if (status === null) throw notFound();
      if (status !== from) throw conflict("This church or ministry is not in a state that can be changed this way");
      const changed = await repo.setOrganizationStatus({ id, from, to, action, reason: input.reason, actorId: ctx.actor.userId, subject: subjectOf("organization", id) });
      if (!changed) throw conflict("This church or ministry has already been changed");
      if (to === "unpublished") {
        await notify(await repo.managerIdsOfOrganization(id), "Your church or ministry was unpublished", "Your church or ministry page and events were removed from public view by a platform admin.", input.reason);
      }
      return { id, state: to };
    },

    /** Suspends a member: they can browse, export and delete, but cannot change events or submit claims. */
    async suspendMember(ctx: ServiceContext, userId: string, input: SuspendMemberInput): Promise<ModerationResult> {
      requireAdmin(ctx);
      if (!(await repo.memberExists(userId))) throw notFound();
      if (userId === ctx.actor.userId) throw conflict("You cannot suspend yourself");
      if (admins.isAdmin(userId)) throw conflict("An admin cannot be suspended");
      const changed = await repo.setSuspended({ userId, suspended: true, reason: input.reason, actorId: ctx.actor.userId, hideEvents: input.eventsAction === "hide", subject: subjectOf("member", userId) });
      if (!changed) throw conflict("This member is already suspended");
      await notify([userId], "Your account was suspended", "Your account was suspended by a platform admin. You can still browse, download your data and delete your account.", input.reason);
      return { id: userId, state: "suspended" };
    },

    async reinstateMember(ctx: ServiceContext, userId: string, input: ModerationReasonInput): Promise<ModerationResult> {
      requireAdmin(ctx);
      if (!(await repo.memberExists(userId))) throw notFound();
      const changed = await repo.setSuspended({ userId, suspended: false, reason: input.reason, actorId: ctx.actor.userId, hideEvents: false, subject: subjectOf("member", userId) });
      if (!changed) throw conflict("This member is not suspended");
      return { id: userId, state: "active" };
    },

    /** The audit log, filtered. There is no way to change or delete an entry. */
    async searchAudit(ctx: ServiceContext, query: AuditQuery): Promise<AuditLog> {
      requireAdmin(ctx);
      const rows = await repo.listAudit(query);
      return { items: rows.map((r) => ({ id: r.id, actorId: r.actorId, action: r.action, subject: r.subject, at: r.at.toISOString(), detail: r.detail })) };
    },

    /** The same, for a legal request. It holds person-to-church links, so the export is itself audited. */
    async exportAudit(ctx: ServiceContext, query: AuditQuery): Promise<AuditLog> {
      requireAdmin(ctx);
      const log = await this.searchAudit(ctx, { ...query, limit: 500 });
      await repo.appendAudit({ actorId: ctx.actor.userId, action: "audit.export", subject: "audit_log", detail: `${log.items.length} entries; filters: ${JSON.stringify({ actor: query.actor, subject: query.subject, from: query.from, to: query.to })}` });
      return log;
    },
  };
}

export type ModerationService = ReturnType<typeof createModerationService>;
