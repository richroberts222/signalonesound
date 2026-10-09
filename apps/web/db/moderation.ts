import { and, count, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";

import type { Database } from "./client";
import { withDbErrors } from "./errors";
import { auditLog, event, organization, organizationMember, report, reportRateLimit, userProfile } from "./schema";

// Data access for reports and admin moderation (S8, docs/features/s8-admin-and-moderation.md).
// Server-only by convention (like all of db/). Every admin change is ONE statement that changes the row
// and writes its audit entry together (a data-modifying CTE), so a change without its audit entry, or
// an audit entry for a change that did not happen, cannot occur, and a repeated change writes nothing.
export type ReportRow = typeof report.$inferSelect;
export type ReportWithTitle = ReportRow & { subjectTitle: string };
export type AuditRow = typeof auditLog.$inferSelect;
export type AuditFilter = { actor?: string; subject?: string; from?: string; to?: string; limit: number };

export type ModerationRepo = ReturnType<typeof createModerationRepo>;

export function createModerationRepo(db: Database) {
  /** Runs one change-and-audit statement; true when it changed a row. */
  async function changeAndAudit(statement: ReturnType<typeof sql>): Promise<boolean> {
    const result = await db.execute(statement);
    return result.rows.length > 0;
  }

  return {
    subjectExists: (type: "event" | "organization", id: string): Promise<boolean> =>
      withDbErrors("moderation.subjectExists", async () => {
        if (type === "event") {
          const [row] = await db.select({ id: event.id }).from(event).where(and(eq(event.id, id), inArray(event.status, ["published", "cancelled"]))).limit(1);
          return row !== undefined;
        }
        const [row] = await db.select({ id: organization.id }).from(organization).where(and(eq(organization.id, id), eq(organization.status, "approved"))).limit(1);
        return row !== undefined;
      }),

    /**
     * Records a report unless this address (a keyed hash) already sent the maximum in the window.
     * Neither the report nor the rate record says who reported.
     */
    recordReport: (input: { subjectType: string; subjectId: string; reason: string; details: string; addressHash: string; maxPerWindow: number; since: Date }): Promise<boolean> =>
      withDbErrors("moderation.recordReport", async () => {
        const [row] = await db
          .select({ n: count() })
          .from(reportRateLimit)
          .where(and(eq(reportRateLimit.addressHash, input.addressHash), gte(reportRateLimit.createdAt, input.since)));
        if (Number(row?.n ?? 0) >= input.maxPerWindow) return false;
        await db.batch([
          db.insert(report).values({ subjectType: input.subjectType, subjectId: input.subjectId, reason: input.reason, details: input.details }),
          db.insert(reportRateLimit).values({ addressHash: input.addressHash }),
        ]);
        return true;
      }),

    purgeRateLimits: (before: Date): Promise<number> =>
      withDbErrors("moderation.purgeRateLimits", async () => {
        const result = await db.execute(sql`delete from report_rate_limit where created_at < ${before.toISOString()}::timestamptz returning id`);
        return result.rows.length;
      }),

    listReports: (status: string): Promise<ReportWithTitle[]> =>
      withDbErrors("moderation.listReports", async () => {
        const rows = await db.select().from(report).where(eq(report.status, status)).orderBy(desc(report.createdAt)).limit(200);
        if (rows.length === 0) return [];
        const eventIds = rows.filter((r) => r.subjectType === "event").map((r) => r.subjectId);
        const orgIds = rows.filter((r) => r.subjectType === "organization").map((r) => r.subjectId);
        const [events, orgs] = await Promise.all([
          eventIds.length ? db.select({ id: event.id, title: event.title }).from(event).where(inArray(event.id, eventIds)) : [],
          orgIds.length ? db.select({ id: organization.id, title: organization.name }).from(organization).where(inArray(organization.id, orgIds)) : [],
        ]);
        const titles = new Map([...events, ...orgs].map((t) => [t.id, t.title]));
        return rows.map((r) => ({ ...r, subjectTitle: titles.get(r.subjectId) ?? "(removed)" }));
      }),

    getReport: (id: string): Promise<ReportRow | null> =>
      withDbErrors("moderation.getReport", async () => {
        const [row] = await db.select().from(report).where(eq(report.id, id)).limit(1);
        return row ?? null;
      }),

    decideReport: (input: { id: string; decision: "dismissed" | "actioned"; reason: string; actorId: string; subject: string }): Promise<boolean> =>
      withDbErrors("moderation.decideReport", () =>
        changeAndAudit(sql`with changed as (
          update report set status = ${input.decision}, decided_at = now() where id = ${input.id}::uuid and status = 'open' returning id
        ) insert into audit_log (actor_id, action, subject, detail)
          select ${input.actorId}, ${`report.${input.decision}`}, ${input.subject}, ${input.reason} from changed returning id`),
      ),

    /** Hides or restores an event from the public. False when it was already in that state. */
    setEventModeration: (input: { id: string; from: string; to: string; action: string; reason: string; actorId: string; subject: string }): Promise<boolean> =>
      withDbErrors("moderation.setEventModeration", () =>
        changeAndAudit(sql`with changed as (
          update event set moderation_state = ${input.to}, updated_at = now() where id = ${input.id}::uuid and moderation_state = ${input.from} returning id
        ) insert into audit_log (actor_id, action, subject, detail)
          select ${input.actorId}, ${input.action}, ${input.subject}, ${input.reason} from changed returning id`),
      ),

    /** Unpublishes or restores an organization. False when it was not in the expected state. */
    setOrganizationStatus: (input: { id: string; from: string; to: string; action: string; reason: string; actorId: string; subject: string }): Promise<boolean> =>
      withDbErrors("moderation.setOrganizationStatus", () =>
        changeAndAudit(sql`with changed as (
          update organization set status = ${input.to} where id = ${input.id}::uuid and status = ${input.from} returning id
        ) insert into audit_log (actor_id, action, subject, detail)
          select ${input.actorId}, ${input.action}, ${input.subject}, ${input.reason} from changed returning id`),
      ),

    /**
     * Suspends or reinstates a member. When suspending with `hideEvents`, the events of the
     * organizations they manage are hidden in the same step. False when nothing changed.
     */
    setSuspended: (input: { userId: string; suspended: boolean; reason: string; actorId: string; hideEvents: boolean; subject: string }): Promise<boolean> =>
      withDbErrors("moderation.setSuspended", async () => {
        // One statement: change the member, write the audit entry, and (when asked) hide the events of
        // the organizations they manage. Either all of it happens or none.
        const result = await db.execute(sql`with changed as (
            update user_profile set suspended = ${input.suspended} where clerk_user_id = ${input.userId} and suspended <> ${input.suspended} returning id
          ), audited as (
            insert into audit_log (actor_id, action, subject, detail)
            select ${input.actorId}, ${input.suspended ? "member.suspend" : "member.reinstate"}, ${input.subject}, ${input.reason} from changed returning id
          ), hidden as (
            update event set moderation_state = 'hidden', updated_at = now()
            where ${input.suspended && input.hideEvents}::boolean and exists (select 1 from changed) and moderation_state = 'published'
              and org_id in (select org_id from organization_member where user_id = ${input.userId} and status = 'approved')
            returning id
          )
          select (select count(*) from changed)::int as n`);
        return Number((result.rows[0] as { n?: number } | undefined)?.n ?? 0) > 0;
      }),

    getEventState: (id: string): Promise<string | null> =>
      withDbErrors("moderation.getEventState", async () => {
        const [row] = await db.select({ state: event.moderationState }).from(event).where(eq(event.id, id)).limit(1);
        return row?.state ?? null;
      }),

    getOrganizationStatus: (id: string): Promise<string | null> =>
      withDbErrors("moderation.getOrganizationStatus", async () => {
        const [row] = await db.select({ status: organization.status }).from(organization).where(eq(organization.id, id)).limit(1);
        return row?.status ?? null;
      }),

    memberExists: (userId: string): Promise<boolean> =>
      withDbErrors("moderation.memberExists", async () => {
        const [row] = await db.select({ id: userProfile.id }).from(userProfile).where(eq(userProfile.clerkUserId, userId)).limit(1);
        return row !== undefined;
      }),

    isSuspended: (userId: string): Promise<boolean> =>
      withDbErrors("moderation.isSuspended", async () => {
        const [row] = await db.select({ suspended: userProfile.suspended }).from(userProfile).where(eq(userProfile.clerkUserId, userId)).limit(1);
        return row?.suspended ?? false;
      }),

    /** Clerk ids of the approved managers of the organization that holds an event (to tell them). */
    managerIdsOfEvent: (eventId: string): Promise<string[]> =>
      withDbErrors("moderation.managerIdsOfEvent", async () => {
        const rows = await db
          .select({ userId: organizationMember.userId })
          .from(event)
          .innerJoin(organizationMember, and(eq(organizationMember.orgId, event.orgId), eq(organizationMember.status, "approved")))
          .where(eq(event.id, eventId));
        return rows.map((r) => r.userId);
      }),

    managerIdsOfOrganization: (orgId: string): Promise<string[]> =>
      withDbErrors("moderation.managerIdsOfOrganization", async () => {
        const rows = await db.select({ userId: organizationMember.userId }).from(organizationMember).where(and(eq(organizationMember.orgId, orgId), eq(organizationMember.status, "approved")));
        return rows.map((r) => r.userId);
      }),

    overview: (): Promise<{ openReports: number; pendingClaims: number; hiddenEvents: number; unpublishedOrganizations: number; suspendedMembers: number }> =>
      withDbErrors("moderation.overview", async () => {
        const one = async (query: Promise<{ n: number }[]>) => Number((await query)[0]?.n ?? 0);
        const [openReports, pendingClaims, hiddenEvents, unpublishedOrganizations, suspendedMembers] = await Promise.all([
          one(db.select({ n: count() }).from(report).where(eq(report.status, "open"))),
          one(db.select({ n: count() }).from(organizationMember).where(eq(organizationMember.status, "pending"))),
          one(db.select({ n: count() }).from(event).where(eq(event.moderationState, "hidden"))),
          one(db.select({ n: count() }).from(organization).where(eq(organization.status, "unpublished"))),
          one(db.select({ n: count() }).from(userProfile).where(eq(userProfile.suspended, true))),
        ]);
        return { openReports, pendingClaims, hiddenEvents, unpublishedOrganizations, suspendedMembers };
      }),

    /** The audit log, newest first, filtered by actor, subject and date (UTC calendar dates). */
    listAudit: (filter: AuditFilter): Promise<AuditRow[]> =>
      withDbErrors("moderation.listAudit", async () => {
        const where = [];
        const like = (s: string) => `%${s.replace(/[\\%_]/g, "\\$&")}%`;
        if (filter.actor) where.push(ilike(auditLog.actorId, like(filter.actor)));
        if (filter.subject) where.push(ilike(auditLog.subject, like(filter.subject)));
        if (filter.from) where.push(gte(auditLog.at, new Date(`${filter.from}T00:00:00Z`)));
        if (filter.to) where.push(lte(auditLog.at, new Date(`${filter.to}T23:59:59.999Z`)));
        return db.select().from(auditLog).where(where.length ? and(...where) : undefined).orderBy(desc(auditLog.at)).limit(filter.limit);
      }),

    appendAudit: (entry: { actorId: string; action: string; subject: string; detail?: string }): Promise<void> =>
      withDbErrors("moderation.appendAudit", async () => {
        await db.insert(auditLog).values({ ...entry, detail: entry.detail ?? "" });
      }),
  };
}
