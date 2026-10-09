import type { ApiClient } from "./api-client";
import {
  adminRequestsSchema,
  claimResultSchema,
  decisionResultSchema,
  myOrganizationsSchema,
  publicOrganizationSchema,
  type ClaimOrganizationInput,
  type DecideRequestInput,
  type PatchOrganizationInput,
  type RevokeInput,
} from "./organization";

// Typed operations for organizations, claims and roles (S2), used identically by web and mobile.
export function createOrganizationClient(api: ApiClient) {
  return {
    claim: (input: ClaimOrganizationInput) =>
      api.request({ method: "POST", path: "/api/v1/organizations/claim", body: input, schema: claimResultSchema }),
    mine: () => api.request({ method: "GET", path: "/api/v1/me/organizations", schema: myOrganizationsSchema }),
    get: (id: string) => api.request({ method: "GET", path: `/api/v1/organizations/${encodeURIComponent(id)}`, schema: publicOrganizationSchema }),
    update: (id: string, input: PatchOrganizationInput) =>
      api.request({ method: "PATCH", path: `/api/v1/organizations/${encodeURIComponent(id)}`, body: input, schema: publicOrganizationSchema }),
    revoke: (orgId: string, userId: string, input: RevokeInput) =>
      api.request({
        method: "POST",
        path: `/api/v1/organizations/${encodeURIComponent(orgId)}/managers/${encodeURIComponent(userId)}/revoke`,
        body: input,
        schema: decisionResultSchema,
      }),
    adminRequests: () => api.request({ method: "GET", path: "/api/v1/admin/manager-requests", schema: adminRequestsSchema }),
    adminDecide: (requestId: string, input: DecideRequestInput) =>
      api.request({
        method: "POST",
        path: `/api/v1/admin/manager-requests/${encodeURIComponent(requestId)}/decision`,
        body: input,
        schema: decisionResultSchema,
      }),
  };
}
