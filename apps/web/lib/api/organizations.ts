import {
  claimOrganizationSchema,
  decideRequestSchema,
  orgParamsSchema,
  patchOrganizationSchema,
  requestParamsSchema,
  revokeParamsSchema,
  revokeSchema,
} from "@signalone/validation";

import type { OrganizationsService } from "../services/organizations";
import type { createApiRoute } from "./handler";

// Route definitions for organizations, claims and roles (S2), kept separate from the Next.js route
// files so acceptance tests run the exact same definitions with a faked identity. Thin: each handler
// calls one service function with validated input. The user is always the authenticated caller, and
// the service decides who may do what.
export function organizationRoutes(route: ReturnType<typeof createApiRoute>, getService: () => OrganizationsService) {
  return {
    claim: {
      POST: route({
        auth: "required",
        input: { schema: claimOrganizationSchema },
        handle: (ctx, input) => getService().claim(ctx, input),
      }),
    },
    organization: {
      GET: route({
        auth: "public",
        params: { schema: orgParamsSchema },
        handle: (_ctx, _input, _request, params) => getService().getPublic(params.id),
      }),
      PATCH: route({
        auth: "required",
        params: { schema: orgParamsSchema },
        input: { schema: patchOrganizationSchema },
        handle: (ctx, input, _request, params) => getService().update(ctx, params.id, input),
      }),
    },
    revoke: {
      POST: route({
        auth: "required",
        params: { schema: revokeParamsSchema },
        input: { schema: revokeSchema },
        handle: (ctx, input, _request, params) => getService().revoke(ctx, params.id, params.userId, input),
      }),
    },
    mine: {
      GET: route({ auth: "required", handle: (ctx) => getService().listMine(ctx) }),
    },
    adminRequests: {
      GET: route({ auth: "required", handle: (ctx) => getService().listRequests(ctx) }),
    },
    adminDecision: {
      POST: route({
        auth: "required",
        params: { schema: requestParamsSchema },
        input: { schema: decideRequestSchema },
        handle: (ctx, input, _request, params) => getService().decide(ctx, params.id, input),
      }),
    },
    adminAudit: {
      GET: route({ auth: "required", handle: (ctx) => getService().listAudit(ctx) }),
    },
  };
}
