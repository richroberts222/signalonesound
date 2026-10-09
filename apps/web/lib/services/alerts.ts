import {
  MAX_ALERT_RULES,
  roundPosition,
  type Alert,
  type AlertList,
  type CreateAlertInput,
  type NotificationSettings,
  type PatchAlertInput,
  type RegisterPushTokenInput,
} from "@signalone/validation";

import type { NotificationsRepo, RuleRow } from "../../db/notifications";
import { verifyUnsubscribeToken } from "../notifications/unsubscribe";
import type { ServiceContext } from "./context";
import { conflict, notFound, validationFailed } from "./errors";
import type { PlaceFinder } from "./discover";

// Service for a member's alerts, phones and notification settings (S7, docs/features/s7-alerts-and-push.md).
// Every read and write is scoped to the authenticated caller. A place is chosen, not tracked: an alert
// keeps the point of the place the member typed, rounded to about 1 km, with its label, and no history.
// Framework-free; the repo, the place finder, the signing secret and the clock are injected.
export type AlertsServiceDeps = {
  repo: NotificationsRepo;
  places: PlaceFinder;
  requireAccepted: (userId: string) => Promise<void>;
  /** Signs unsubscribe links. Null means unsubscribe links are not available. */
  unsubscribeSecret: string | null;
  now?: () => Date;
};

const toAlert = (r: RuleRow): Alert => ({
  id: r.id,
  placeLabel: r.placeLabel,
  radius: r.radiusMiles ?? "any",
  timeframeDays: r.timeframeDays as 7 | 14 | 30,
  types: r.types ? r.types.split(",") : [],
  immediate: r.immediate,
  paused: r.paused,
  createdAt: r.createdAt.toISOString(),
});

export function createAlertsService({ repo, places, requireAccepted, unsubscribeSecret, now = () => new Date() }: AlertsServiceDeps) {
  /** Turns the typed place into a rounded point and a label, or says it was not found. */
  function locate(place: string) {
    const match = places(place, 1)[0];
    if (!match) throw validationFailed("We could not find that place. Try a ZIP code or City, ST.", { place: ["Place not found"] });
    return { placeLabel: match.label, lat: roundPosition(match.lat), lng: roundPosition(match.lng) };
  }

  return {
    async list(ctx: ServiceContext): Promise<AlertList> {
      return { items: (await repo.listRules(ctx.actor.userId)).map(toAlert) };
    },

    /** Creates an alert (at most 10). Push permission is asked by the app at this moment, not before. */
    async create(ctx: ServiceContext, input: CreateAlertInput): Promise<Alert> {
      const userId = ctx.actor.userId;
      await requireAccepted(userId);
      if ((await repo.countRules(userId)) >= MAX_ALERT_RULES) throw conflict(`You can have at most ${MAX_ALERT_RULES} alerts. Remove one to add another.`);
      const where = locate(input.place);
      const row = await repo.insertRule({
        userId,
        ...where,
        radiusMiles: input.radius === "any" ? null : input.radius,
        timeframeDays: input.timeframeDays,
        types: input.types.join(","),
        immediate: input.immediate,
        paused: false,
      });
      return toAlert(row);
    },

    async update(ctx: ServiceContext, id: string, patch: PatchAlertInput): Promise<Alert> {
      await requireAccepted(ctx.actor.userId);
      const row = await repo.updateRule(id, ctx.actor.userId, {
        ...(patch.place !== undefined ? locate(patch.place) : {}),
        ...(patch.radius !== undefined ? { radiusMiles: patch.radius === "any" ? null : patch.radius } : {}),
        ...(patch.timeframeDays !== undefined ? { timeframeDays: patch.timeframeDays } : {}),
        ...(patch.types !== undefined ? { types: patch.types.join(",") } : {}),
        ...(patch.immediate !== undefined ? { immediate: patch.immediate } : {}),
        ...(patch.paused !== undefined ? { paused: patch.paused } : {}),
      });
      if (!row) throw notFound();
      return toAlert(row);
    },

    async remove(ctx: ServiceContext, id: string): Promise<{ revoked: boolean }> {
      if (!(await repo.deleteRule(id, ctx.actor.userId))) throw notFound();
      return { revoked: true };
    },

    /** Remembers a phone's push address for this member. A phone belongs to one member at a time. */
    async registerPushToken(ctx: ServiceContext, input: RegisterPushTokenInput): Promise<{ id: string }> {
      await requireAccepted(ctx.actor.userId);
      return { id: await repo.upsertToken(ctx.actor.userId, input.token, input.platform) };
    },

    async revokePushToken(ctx: ServiceContext, id: string): Promise<{ revoked: boolean }> {
      if (!(await repo.revokeToken(id, ctx.actor.userId))) throw notFound();
      return { revoked: true };
    },

    async getSettings(ctx: ServiceContext): Promise<NotificationSettings> {
      return { reminders: await repo.getReminders(ctx.actor.userId) };
    },

    async updateSettings(ctx: ServiceContext, reminders: boolean): Promise<NotificationSettings> {
      await requireAccepted(ctx.actor.userId);
      await repo.setReminders(ctx.actor.userId, reminders);
      return { reminders };
    },

    /** Stop hearing about one church. Always succeeds, so it cannot be used to find out which churches exist. */
    async muteOrganization(ctx: ServiceContext, orgId: string): Promise<{ orgId: string; muted: boolean }> {
      await repo.addMute(ctx.actor.userId, orgId);
      return { orgId, muted: true };
    },

    async unmuteOrganization(ctx: ServiceContext, orgId: string): Promise<{ orgId: string; muted: boolean }> {
      await repo.removeMute(ctx.actor.userId, orgId);
      return { orgId, muted: false };
    },

    /** The one-tap unsubscribe: works without signing in, for exactly what the signed link was made for. */
    async unsubscribe(token: string): Promise<{ done: true; what: "church" | "alert" }> {
      if (!unsubscribeSecret) throw validationFailed("Unsubscribe links are not available");
      const action = verifyUnsubscribeToken(token, unsubscribeSecret, now());
      if (!action) throw notFound(); // altered, expired or not ours
      if (action.kind === "church") {
        await repo.addMute(action.userId, action.id);
        return { done: true, what: "church" };
      }
      await repo.updateRule(action.id, action.userId, { paused: true });
      return { done: true, what: "alert" };
    },
  };
}

export type AlertsService = ReturnType<typeof createAlertsService>;
