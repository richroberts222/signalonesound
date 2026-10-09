import { addDays, localToUtc, utcToZoned } from "@signalone/shared";

// The notification policy (S7, docs/features/s7-alerts-and-push.md): when a message may be sent, and
// when it must wait or be dropped, so people are told about what matters without being spammed.
// Pure functions of the clock and the counts, so every rule can be tested by moving time.
//   * Quiet hours are 9 pm to 8 am in the member's own time zone: nothing is sent then; it waits.
//   * A new-event alert is part of one daily digest at 9 am, unless the member chose immediate
//     alerts, and then only one immediate alert is sent per day; the rest join the digest.
//   * At most 3 new-event alerts per church per member per week; the rest are dropped.
//   * A reminder or a change to an event the member saved is time-sensitive: it is not capped, but it
//     still waits out quiet hours.

export const QUIET_START_HOUR = 21;
export const QUIET_END_HOUR = 8;
export const DIGEST_HOUR = 9;
export const MAX_IMMEDIATE_PER_DAY = 1;
export const MAX_PER_ORG_PER_WEEK = 3;
export const DEFAULT_TIME_ZONE = "America/Chicago";

export type NotificationKind = "new_event" | "event_changed" | "reminder";

export type PlanInput = {
  kind: NotificationKind;
  /** The member chose immediate alerts (otherwise new events go in the daily digest). */
  immediate: boolean;
  now: Date;
  timeZone: string;
  /** Immediate alerts already sent to this member today (their own calendar day). */
  immediateSentToday: number;
  /** New-event alerts about this church already sent to this member in the last 7 days. */
  orgSentThisWeek: number;
};

export type Plan =
  | { action: "send"; at: Date; channel: "now" | "digest" }
  | { action: "drop"; reason: "org_weekly_cap" };

/** Is this moment inside quiet hours on the member's clock? */
export function inQuietHours(now: Date, timeZone: string): boolean {
  const hour = utcToZoned(now, timeZone).hour;
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

/** The next moment (strictly after `now`) when the member's clock reads `hour`:00. */
export function nextLocalHour(now: Date, timeZone: string, hour: number): Date {
  const local = utcToZoned(now, timeZone);
  const date = `${String(local.year).padStart(4, "0")}-${String(local.month).padStart(2, "0")}-${String(local.day).padStart(2, "0")}`;
  const at = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    return localToUtc({ year: y, month: m, day, hour, minute: 0 }, timeZone);
  };
  const today = at(date);
  return today.getTime() > now.getTime() ? today : at(addDays(date, 1));
}

/** When a time-sensitive message may go out: now, or at 8 am if it is quiet hours. */
export function sendTimeAfterQuietHours(now: Date, timeZone: string): Date {
  return inQuietHours(now, timeZone) ? nextLocalHour(now, timeZone, QUIET_END_HOUR) : now;
}

/** The start of the member's current calendar day, as an exact moment (for counting "today"). */
export function startOfLocalDay(now: Date, timeZone: string): Date {
  const l = utcToZoned(now, timeZone);
  return localToUtc({ year: l.year, month: l.month, day: l.day, hour: 0, minute: 0 }, timeZone);
}

export function planDelivery(input: PlanInput): Plan {
  const { kind, immediate, now, timeZone } = input;
  if (kind === "event_changed" || kind === "reminder") {
    return { action: "send", at: sendTimeAfterQuietHours(now, timeZone), channel: "now" };
  }
  // A new-event alert.
  if (input.orgSentThisWeek >= MAX_PER_ORG_PER_WEEK) return { action: "drop", reason: "org_weekly_cap" };
  if (immediate && input.immediateSentToday < MAX_IMMEDIATE_PER_DAY) {
    return { action: "send", at: sendTimeAfterQuietHours(now, timeZone), channel: "now" };
  }
  return { action: "send", at: nextLocalHour(now, timeZone, DIGEST_HOUR), channel: "digest" };
}
