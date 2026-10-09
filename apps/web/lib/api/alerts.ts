import {
  alertParamsSchema,
  createAlertSchema,
  orgMuteParamsSchema,
  patchAlertSchema,
  pushTokenParamsSchema,
  putNotificationSettingsSchema,
  registerPushTokenSchema,
  unsubscribeParamsSchema,
} from "@signalone/validation";

import { UnauthenticatedError } from "../auth/errors";
import type { AlertsService } from "../services/alerts";
import type { Notifier } from "../services/notifier";
import type { createApiRoute } from "./handler";

// Route definitions for alerts, phones and settings (S7), kept separate from the Next.js route files so
// acceptance tests run the exact same definitions with a faked identity. The user is always the
// authenticated caller; the unsubscribe link is the one public route, and proves itself by signature.
export function alertRoutes(route: ReturnType<typeof createApiRoute>, getService: () => AlertsService) {
  return {
    alerts: {
      GET: route({ auth: "required", handle: (ctx) => getService().list(ctx) }),
      POST: route({ auth: "required", input: { schema: createAlertSchema }, handle: (ctx, input) => getService().create(ctx, input) }),
    },
    alert: {
      PATCH: route({
        auth: "required",
        params: { schema: alertParamsSchema },
        input: { schema: patchAlertSchema },
        handle: (ctx, input, _request, params) => getService().update(ctx, params.id, input),
      }),
      DELETE: route({ auth: "required", params: { schema: alertParamsSchema }, handle: (ctx, _input, _request, params) => getService().remove(ctx, params.id) }),
    },
    pushTokens: {
      POST: route({ auth: "required", input: { schema: registerPushTokenSchema }, handle: (ctx, input) => getService().registerPushToken(ctx, input) }),
    },
    pushToken: {
      DELETE: route({ auth: "required", params: { schema: pushTokenParamsSchema }, handle: (ctx, _input, _request, params) => getService().revokePushToken(ctx, params.id) }),
    },
    settings: {
      GET: route({ auth: "required", handle: (ctx) => getService().getSettings(ctx) }),
      PUT: route({ auth: "required", input: { schema: putNotificationSettingsSchema }, handle: (ctx, input) => getService().updateSettings(ctx, input.reminders) }),
    },
    mute: {
      PUT: route({ auth: "required", params: { schema: orgMuteParamsSchema }, handle: (ctx, _input, _request, params) => getService().muteOrganization(ctx, params.orgId) }),
      DELETE: route({ auth: "required", params: { schema: orgMuteParamsSchema }, handle: (ctx, _input, _request, params) => getService().unmuteOrganization(ctx, params.orgId) }),
    },
    unsubscribe: {
      POST: route({ auth: "public", params: { schema: unsubscribeParamsSchema }, handle: (_ctx, _input, _request, params) => getService().unsubscribe(params.token) }),
    },
  };
}

/** The scheduled job that queues reminders, sends what is due and clears old rows. Needs the scheduler's secret. */
export function notificationJobRoutes(
  route: ReturnType<typeof createApiRoute>,
  deps: { authorized: (request: Request) => boolean; notifier: () => Notifier },
) {
  return {
    run: {
      GET: route({
        auth: "public",
        handle: async (_ctx, _input, request) => {
          if (!deps.authorized(request)) throw new UnauthenticatedError();
          const notifier = deps.notifier();
          const reminders = await notifier.enqueueReminders();
          const delivery = await notifier.deliverDue();
          const purged = await notifier.purge();
          return { remindersQueued: reminders.queued, ...delivery, purged: purged.removed };
        },
      }),
    },
  };
}
