import { z } from "zod";

import { REVIVAL_TYPE_SLUGS } from "./event";
import { RADIUS_X_MILES } from "./discover";

// S7 ALERTS AND PUSH (docs/features/s7-alerts-and-push.md). Public wire contracts for the alerts a
// member sets up, their phones' push addresses, and the one-tap unsubscribe. A place is chosen, not
// tracked: an alert stores a point rounded to about 1 km with the typed label, and no history.

export const MAX_ALERT_RULES = 10;
export const ALERT_TIMEFRAMES = [7, 14, 30] as const;
export const ALERT_RADIUS_CHOICES = [10, 25, 50, RADIUS_X_MILES] as const;

const timeframe = z.union([z.literal(7), z.literal(14), z.literal(30)]);
const radius = z.union([z.literal("any"), z.number().int().min(1).max(RADIUS_X_MILES)]);
const types = z
  .array(z.enum(REVIVAL_TYPE_SLUGS, { error: "Unknown revival type" }))
  .max(REVIVAL_TYPE_SLUGS.length)
  .refine((v) => new Set(v).size === v.length, "Each revival type once");

/** A new alert. `place` is a ZIP code or "City, ST"; the server turns it into a point. */
export const createAlertSchema = z
  .object({
    place: z.string().trim().min(1, "Enter a place").max(100),
    radius: radius.default(25),
    timeframeDays: timeframe.default(30),
    /** Empty means every kind of gathering. */
    types: types.default([]),
    /** Send alerts as they happen (at most one a day), instead of one daily digest. */
    immediate: z.boolean().default(false),
  })
  .strict();
export type CreateAlertInput = z.infer<typeof createAlertSchema>;

export const patchAlertSchema = z
  .object({
    place: z.string().trim().min(1).max(100).optional(),
    radius: radius.optional(),
    timeframeDays: timeframe.optional(),
    types: types.optional(),
    immediate: z.boolean().optional(),
    paused: z.boolean().optional(),
  })
  .strict();
export type PatchAlertInput = z.infer<typeof patchAlertSchema>;

export const alertParamsSchema = z.object({ id: z.string().uuid() });

export const alertSchema = z.object({
  id: z.string().uuid(),
  placeLabel: z.string(),
  radius: radius,
  timeframeDays: timeframe,
  types: z.array(z.string()),
  immediate: z.boolean(),
  paused: z.boolean(),
  createdAt: z.string(),
});
export type Alert = z.infer<typeof alertSchema>;
export const alertListSchema = z.object({ items: z.array(alertSchema) });
export type AlertList = z.infer<typeof alertListSchema>;

export const registerPushTokenSchema = z
  .object({
    token: z.string().trim().min(10).max(200),
    platform: z.enum(["ios", "android"]),
  })
  .strict();
export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;
export const pushTokenParamsSchema = z.object({ id: z.string().uuid() });
export const pushTokenSchema = z.object({ id: z.string().uuid() });
export const revokedSchema = z.object({ revoked: z.boolean() });

export const notificationSettingsSchema = z.object({ reminders: z.boolean() });
export type NotificationSettings = z.infer<typeof notificationSettingsSchema>;
export const putNotificationSettingsSchema = z.object({ reminders: z.boolean() }).strict();

export const orgMuteParamsSchema = z.object({ orgId: z.string().uuid() });
export const muteResultSchema = z.object({ orgId: z.string().uuid(), muted: z.boolean() });

export const unsubscribeParamsSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_.-]{20,400}$/) }) // a signed link is two parts joined by a dot;
export const unsubscribeResultSchema = z.object({ done: z.literal(true), what: z.enum(["church", "alert"]) });
