import type { ApiClient } from "./api-client";
import {
  alertListSchema,
  alertSchema,
  muteResultSchema,
  notificationSettingsSchema,
  pushTokenSchema,
  revokedSchema,
  unsubscribeResultSchema,
  type CreateAlertInput,
  type PatchAlertInput,
  type RegisterPushTokenInput,
} from "./alerts";

// Typed operations for alerts and push (S7), used identically by web and mobile.
export function createAlertsClient(api: ApiClient) {
  const alert = (id: string) => `/api/v1/me/alerts/${encodeURIComponent(id)}`;
  return {
    list: () => api.request({ method: "GET", path: "/api/v1/me/alerts", schema: alertListSchema }),
    create: (input: CreateAlertInput) => api.request({ method: "POST", path: "/api/v1/me/alerts", body: input, schema: alertSchema }),
    update: (id: string, input: PatchAlertInput) => api.request({ method: "PATCH", path: alert(id), body: input, schema: alertSchema }),
    remove: (id: string) => api.request({ method: "DELETE", path: alert(id), schema: revokedSchema }),
    registerPushToken: (input: RegisterPushTokenInput) => api.request({ method: "POST", path: "/api/v1/me/push-tokens", body: input, schema: pushTokenSchema }),
    revokePushToken: (id: string) => api.request({ method: "DELETE", path: `/api/v1/me/push-tokens/${encodeURIComponent(id)}`, schema: revokedSchema }),
    settings: () => api.request({ method: "GET", path: "/api/v1/me/notification-settings", schema: notificationSettingsSchema }),
    updateSettings: (reminders: boolean) => api.request({ method: "PUT", path: "/api/v1/me/notification-settings", body: { reminders }, schema: notificationSettingsSchema }),
    muteOrganization: (orgId: string) => api.request({ method: "PUT", path: `/api/v1/me/organization-mutes/${encodeURIComponent(orgId)}`, schema: muteResultSchema }),
    unmuteOrganization: (orgId: string) => api.request({ method: "DELETE", path: `/api/v1/me/organization-mutes/${encodeURIComponent(orgId)}`, schema: muteResultSchema }),
    unsubscribe: (token: string) => api.request({ method: "POST", path: `/api/v1/unsubscribe/${encodeURIComponent(token)}`, schema: unsubscribeResultSchema }),
  };
}
