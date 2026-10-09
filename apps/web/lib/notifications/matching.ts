import { milesBetween } from "@signalone/shared";

// Does an event fit an alert rule? (S7, docs/features/s7-alerts-and-push.md.) A pure function of the
// rule, the event and the clock, so it can be tested exhaustively and used the same way by the matching
// job and by any preview.
export type RuleForMatch = { lat: number; lng: number; radiusMiles: number | null; timeframeDays: number; types: string[] };
export type EventForMatch = { lat: number | null; lng: number | null; startsAt: Date; status: string; revivalTypes: string[] };

const DAY_MS = 24 * 60 * 60 * 1000;

export function matchesRule(rule: RuleForMatch, event: EventForMatch, now: Date): boolean {
  if (event.status !== "published") return false; // a cancelled or draft event is never "coming up"
  if (event.lat === null || event.lng === null) return false; // an event with no position cannot be near anyone
  const starts = event.startsAt.getTime();
  if (starts < now.getTime() || starts > now.getTime() + rule.timeframeDays * DAY_MS) return false;
  if (rule.types.length > 0 && !event.revivalTypes.some((t) => rule.types.includes(t))) return false;
  if (rule.radiusMiles !== null && milesBetween({ lat: rule.lat, lng: rule.lng }, { lat: event.lat, lng: event.lng }) > rule.radiusMiles) return false;
  return true;
}
