import type { ApiClient } from "./api-client";
import { auditLogSchema } from "./organization";
import {
  moderationResultSchema,
  overviewSchema,
  reportListSchema,
  reportReceivedSchema,
  type AuditQuery,
  type CreateReportInput,
  type ModerationReasonInput,
  type ReportDecisionInput,
  type SuspendMemberInput,
} from "./moderation";

// Typed operations for reports and admin moderation (S8), used identically by web and mobile. The
// admin operations only work for platform admins; everyone else gets "not found".
export function createModerationClient(api: ApiClient) {
  const admin = "/api/v1/admin";
  const post = (path: string, body: unknown) => api.request({ method: "POST", path, body, schema: moderationResultSchema });
  const queryOf = (query: Partial<Omit<AuditQuery, "limit">> & { limit?: number }) =>
    Object.fromEntries(Object.entries(query).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
  return {
    report: (input: CreateReportInput) => api.request({ method: "POST", path: "/api/v1/reports", body: input, schema: reportReceivedSchema }),
    overview: () => api.request({ method: "GET", path: `${admin}/overview`, schema: overviewSchema }),
    reports: (status: "open" | "dismissed" | "actioned" = "open") => api.request({ method: "GET", path: `${admin}/reports`, query: { status }, schema: reportListSchema }),
    decideReport: (id: string, input: ReportDecisionInput) => post(`${admin}/reports/${encodeURIComponent(id)}/decision`, input),
    hideEvent: (id: string, input: ModerationReasonInput) => post(`${admin}/events/${encodeURIComponent(id)}/hide`, input),
    restoreEvent: (id: string, input: ModerationReasonInput) => post(`${admin}/events/${encodeURIComponent(id)}/restore`, input),
    unpublishOrganization: (id: string, input: ModerationReasonInput) => post(`${admin}/organizations/${encodeURIComponent(id)}/unpublish`, input),
    restoreOrganization: (id: string, input: ModerationReasonInput) => post(`${admin}/organizations/${encodeURIComponent(id)}/restore`, input),
    suspendMember: (userId: string, input: SuspendMemberInput) => post(`${admin}/members/${encodeURIComponent(userId)}/suspend`, input),
    reinstateMember: (userId: string, input: ModerationReasonInput) => post(`${admin}/members/${encodeURIComponent(userId)}/reinstate`, input),
    searchAudit: (query: Partial<Omit<AuditQuery, "limit">> & { limit?: number } = {}) =>
      api.request({ method: "GET", path: `${admin}/audit/search`, query: queryOf(query), schema: auditLogSchema }),
    exportAudit: (query: Partial<Omit<AuditQuery, "limit">> = {}) =>
      api.request({ method: "GET", path: `${admin}/audit/export`, query: queryOf(query), schema: auditLogSchema }),
  };
}
