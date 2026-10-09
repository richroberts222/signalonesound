import {
  auditQuerySchema,
  createReportSchema,
  moderationEventParamsSchema,
  moderationMemberParamsSchema,
  moderationOrgParamsSchema,
  moderationReasonSchema,
  reportDecisionSchema,
  reportListQuerySchema,
  reportParamsSchema,
  suspendMemberSchema,
} from "@signalone/validation";

import type { ModerationService } from "../services/moderation";
import type { createApiRoute } from "./handler";

/** The network address of the caller as the hosting platform reports it, or null. Used only to be hashed. */
export function addressOf(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || null;
}

// Route definitions for reports and admin moderation (S8), kept separate from the Next.js route files
// so acceptance tests run the exact same definitions with a faked identity. The report route is
// public and reads no identity; every other route is admin-only and answers "not found" to everyone else.
export function moderationRoutes(route: ReturnType<typeof createApiRoute>, getService: () => ModerationService) {
  const reason = (action: "hideEvent" | "restoreEvent" | "unpublishOrganization" | "restoreOrganization") =>
    route({
      auth: "required",
      params: { schema: action.endsWith("Event") ? moderationEventParamsSchema : moderationOrgParamsSchema },
      input: { schema: moderationReasonSchema },
      handle: (ctx, input, _request, params) => getService()[action](ctx, params.id, input),
    });
  return {
    report: {
      POST: route({
        auth: "public",
        input: { schema: createReportSchema },
        handle: (_ctx, input, request) => getService().report(input, addressOf(request)),
      }),
    },
    overview: { GET: route({ auth: "required", handle: (ctx) => getService().overview(ctx) }) },
    reports: {
      GET: route({
        auth: "required",
        input: { schema: reportListQuerySchema, source: "query" },
        handle: (ctx, input) => getService().listReports(ctx, input.status),
      }),
    },
    reportDecision: {
      POST: route({
        auth: "required",
        params: { schema: reportParamsSchema },
        input: { schema: reportDecisionSchema },
        handle: (ctx, input, _request, params) => getService().decideReport(ctx, params.id, input),
      }),
    },
    hideEvent: { POST: reason("hideEvent") },
    restoreEvent: { POST: reason("restoreEvent") },
    unpublishOrganization: { POST: reason("unpublishOrganization") },
    restoreOrganization: { POST: reason("restoreOrganization") },
    suspend: {
      POST: route({
        auth: "required",
        params: { schema: moderationMemberParamsSchema },
        input: { schema: suspendMemberSchema },
        handle: (ctx, input, _request, params) => getService().suspendMember(ctx, params.userId, input),
      }),
    },
    reinstate: {
      POST: route({
        auth: "required",
        params: { schema: moderationMemberParamsSchema },
        input: { schema: moderationReasonSchema },
        handle: (ctx, input, _request, params) => getService().reinstateMember(ctx, params.userId, input),
      }),
    },
    auditSearch: {
      GET: route({
        auth: "required",
        input: { schema: auditQuerySchema, source: "query" },
        handle: (ctx, input) => getService().searchAudit(ctx, input),
      }),
    },
    auditExport: {
      GET: route({
        auth: "required",
        input: { schema: auditQuerySchema, source: "query" },
        handle: (ctx, input) => getService().exportAudit(ctx, input),
      }),
    },
  };
}
