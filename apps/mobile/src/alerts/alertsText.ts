import { MAX_ALERT_RULES, REVIVAL_TYPES, type Alert, type CreateAlertInput } from "@signalone/validation";

// The words and small rules behind the phone's Alerts screen (S7). Plain data with no React Native import, so a
// test can check them. The server decides everything (the limit, the place lookup, the quiet-hours rules); this
// only turns what the person chose into a request and what came back into words.

/** 0 is "12:00 AM", 12 is "12:00 PM", 21 is "9:00 PM". */
export const hourLabel = (h: number): string => `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "AM" : "PM"}`;

/** One hour later or earlier on the 24-hour clock, wrapping past midnight. */
export const stepHour = (h: number, delta: 1 | -1): number => (h + delta + 24) % 24;

export type AlertDraft = { place: string; radius: number | "any"; timeframeDays: 7 | 14 | 30; types: string[]; immediate: boolean };
export const EMPTY_DRAFT: AlertDraft = { place: "", radius: 25, timeframeDays: 30, types: [], immediate: false };

/** The request for a new alert. Typed words are trimmed; the server turns the place into a rounded point. */
export function draftToInput(draft: AlertDraft): CreateAlertInput {
  return { place: draft.place.trim(), radius: draft.radius, timeframeDays: draft.timeframeDays, types: draft.types, immediate: draft.immediate };
}

const typeLabel = (slug: string) => REVIVAL_TYPES.find((t) => t.slug === slug)?.label ?? slug;

/** "Boise, ID, within 25 miles, next 30 days, all kinds, daily digest" (and "Paused" first when it is paused). */
export function alertSummary(alert: Pick<Alert, "placeLabel" | "radius" | "timeframeDays" | "types" | "immediate" | "paused">): string {
  const parts = [
    alert.placeLabel,
    alert.radius === "any" ? "any distance" : `within ${alert.radius} miles`,
    `next ${alert.timeframeDays} days`,
    alert.types.length === 0 ? "all kinds" : alert.types.map(typeLabel).join(", "),
    alert.immediate ? "as it happens" : "daily digest",
  ];
  return `${alert.paused ? "Paused. " : ""}${parts.join(", ")}`;
}

export const SIGNED_OUT_TEXT = "Sign in to get alerts when a revival is coming near you. You can browse without an account.";
export const ALERTS_ERROR_TEXT = "We could not load your alerts. Check your connection and try again.";
export const ALERTS_EMPTY_TEXT = "You have no alerts yet. Add one to hear when a revival is coming near you.";
export const PUSH_NOTE = "Phone notifications arrive in a later update of the app. Your alerts are saved now.";

export const limitText = (count: number): string => `${count} of ${MAX_ALERT_RULES} alerts`;
export const atLimit = (count: number): boolean => count >= MAX_ALERT_RULES;
