import { randomUUID } from "node:crypto";

import type { AuditRow, ModerationRepo, ReportRow } from "./moderation";

// Test-only in-memory stand-in for the moderation repo. A `World` holds the events, churches, members
// and managers it acts on, so a test can set the scene and look at the result. It mimics what the
// service relies on: every change writes its audit entry together with the change, and a change that
// finds the row already in the target state changes and writes nothing. Never used in application code.
export type World = {
  events: Map<string, { orgId: string; title: string; status: string; moderationState: string }>;
  orgs: Map<string, { name: string; status: string }>;
  members: Map<string, { suspended: boolean }>;
  managers: { orgId: string; userId: string }[];
};
export const emptyWorld = (): World => ({ events: new Map(), orgs: new Map(), members: new Map(), managers: [] });

export type FakeModerationRepo = ModerationRepo & {
  audit: AuditRow[];
  reports: ReportRow[];
  rateRows: { addressHash: string; createdAt: Date }[];
};

export function createFakeModerationRepo(world: World, now: () => Date = () => new Date()): FakeModerationRepo {
  const audit: AuditRow[] = [];
  const reports: ReportRow[] = [];
  const rateRows: { addressHash: string; createdAt: Date }[] = [];
  const log = (actorId: string, action: string, subject: string, detail: string) =>
    audit.push({ id: randomUUID(), actorId, action, subject, detail, at: now() });

  return {
    audit,
    reports,
    rateRows,
    async subjectExists(type, id) {
      if (type === "event") {
        const e = world.events.get(id);
        return e !== undefined && ["published", "cancelled"].includes(e.status);
      }
      return world.orgs.get(id)?.status === "approved";
    },
    async recordReport(input) {
      if (rateRows.filter((r) => r.addressHash === input.addressHash && r.createdAt >= input.since).length >= input.maxPerWindow) return false;
      reports.push({ id: randomUUID(), subjectType: input.subjectType, subjectId: input.subjectId, reason: input.reason, details: input.details, status: "open", createdAt: now(), decidedAt: null });
      rateRows.push({ addressHash: input.addressHash, createdAt: now() });
      return true;
    },
    async purgeRateLimits(before) {
      const keep = rateRows.filter((r) => r.createdAt >= before);
      const removed = rateRows.length - keep.length;
      rateRows.splice(0, rateRows.length, ...keep);
      return removed;
    },
    async listReports(status) {
      return reports
        .filter((r) => r.status === status)
        .map((r) => ({ ...r, subjectTitle: world.events.get(r.subjectId)?.title ?? world.orgs.get(r.subjectId)?.name ?? "(removed)" }));
    },
    async getReport(id) {
      const r = reports.find((x) => x.id === id);
      return r ? { ...r } : null;
    },
    async decideReport(input) {
      const r = reports.find((x) => x.id === input.id);
      if (!r || r.status !== "open") return false;
      r.status = input.decision;
      r.decidedAt = now();
      log(input.actorId, `report.${input.decision}`, input.subject, input.reason);
      return true;
    },
    async setEventModeration(input) {
      const e = world.events.get(input.id);
      if (!e || e.moderationState !== input.from) return false;
      e.moderationState = input.to;
      log(input.actorId, input.action, input.subject, input.reason);
      return true;
    },
    async setOrganizationStatus(input) {
      const o = world.orgs.get(input.id);
      if (!o || o.status !== input.from) return false;
      o.status = input.to;
      log(input.actorId, input.action, input.subject, input.reason);
      return true;
    },
    async setSuspended(input) {
      const m = world.members.get(input.userId);
      if (!m || m.suspended === input.suspended) return false;
      m.suspended = input.suspended;
      log(input.actorId, input.suspended ? "member.suspend" : "member.reinstate", input.subject, input.reason);
      if (input.suspended && input.hideEvents) {
        const orgIds = world.managers.filter((x) => x.userId === input.userId).map((x) => x.orgId);
        for (const e of world.events.values()) if (orgIds.includes(e.orgId) && e.moderationState === "published") e.moderationState = "hidden";
      }
      return true;
    },
    async isSuspended(userId) {
      return world.members.get(userId)?.suspended ?? false;
    },
    async getEventState(id) {
      return world.events.get(id)?.moderationState ?? null;
    },
    async getOrganizationStatus(id) {
      return world.orgs.get(id)?.status ?? null;
    },
    async memberExists(userId) {
      return world.members.has(userId);
    },
    async managerIdsOfEvent(eventId) {
      const orgId = world.events.get(eventId)?.orgId;
      return world.managers.filter((m) => m.orgId === orgId).map((m) => m.userId);
    },
    async managerIdsOfOrganization(orgId) {
      return world.managers.filter((m) => m.orgId === orgId).map((m) => m.userId);
    },
    async overview() {
      return {
        openReports: reports.filter((r) => r.status === "open").length,
        pendingClaims: 0,
        hiddenEvents: [...world.events.values()].filter((e) => e.moderationState === "hidden").length,
        unpublishedOrganizations: [...world.orgs.values()].filter((o) => o.status === "unpublished").length,
        suspendedMembers: [...world.members.values()].filter((m) => m.suspended).length,
      };
    },
    async listAudit(filter) {
      return audit
        .filter((a) => (!filter.actor || a.actorId.toLowerCase().includes(filter.actor.toLowerCase())) && (!filter.subject || a.subject.toLowerCase().includes(filter.subject.toLowerCase())))
        .filter((a) => (!filter.from || a.at >= new Date(`${filter.from}T00:00:00Z`)) && (!filter.to || a.at <= new Date(`${filter.to}T23:59:59.999Z`)))
        .sort((a, b) => b.at.getTime() - a.at.getTime())
        .slice(0, filter.limit);
    },
    async appendAudit(entry) {
      log(entry.actorId, entry.action, entry.subject, entry.detail ?? "");
    },
  };
}
