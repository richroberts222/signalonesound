import type { ApiClient } from "./api-client";
import {
  EXPORT_PATH,
  ME_PATH,
  POLICY_ACCEPTANCE_PATH,
  dataExportSchema,
  deletedAccountSchema,
  profileSchema,
  type AcceptPolicyInput,
  type PatchProfileInput,
} from "./profile";

// Typed operations for the member's own profile, used identically by web and mobile.
export function createProfileClient(api: ApiClient) {
  return {
    get: () => api.request({ method: "GET", path: ME_PATH, schema: profileSchema }),
    update: (input: PatchProfileInput) =>
      api.request({ method: "PATCH", path: ME_PATH, body: input, schema: profileSchema }),
    acceptPolicy: (input: AcceptPolicyInput) =>
      api.request({ method: "POST", path: POLICY_ACCEPTANCE_PATH, body: input, schema: profileSchema }),
    exportData: () => api.request({ method: "GET", path: EXPORT_PATH, schema: dataExportSchema }),
    deleteAccount: () => api.request({ method: "DELETE", path: ME_PATH, schema: deletedAccountSchema }),
  };
}
