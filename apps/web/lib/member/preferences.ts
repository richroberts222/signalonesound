// Mock-stage logic for the member notification-preferences flow (Issue #74).
// Nothing here is persisted. Real preference storage, delivery, and matching
// semantics belong to a later Data Requirements Review and server-side services.

export const MAX_LOCATIONS = 3;

export const RADIUS_CHOICES = [10, 25, 50] as const;
export type AlertRadius = (typeof RADIUS_CHOICES)[number];

export const TIMEFRAMES = [
  { id: "next-7-days", label: "Next 7 days" },
  { id: "next-30-days", label: "Next 30 days" },
  { id: "weekends", label: "Weekends only" },
  { id: "evenings", label: "Weekday evenings" },
] as const;
export type TimeframeId = (typeof TIMEFRAMES)[number]["id"];

export type AlertLocation = {
  id: string;
  label: string;
  radius: AlertRadius;
};

export type NotificationPrefs = {
  enabled: boolean;
  locations: AlertLocation[];
  timeframes: TimeframeId[];
};

export type PrefsErrors = { locations?: string; timeframes?: string };

export function toggleTimeframe(selected: TimeframeId[], id: TimeframeId): TimeframeId[] {
  const next = new Set(selected);
  if (!next.delete(id)) next.add(id);
  return TIMEFRAMES.map((t) => t.id).filter((t) => next.has(t));
}

export function canAddLocation(locations: AlertLocation[]): boolean {
  return locations.length < MAX_LOCATIONS;
}

/** Returns the new list, or the unchanged list when the label is blank, a duplicate, or at the cap. */
export function addLocation(
  locations: AlertLocation[],
  label: string,
  radius: AlertRadius,
): AlertLocation[] {
  const clean = label.trim().replace(/\s+/g, " ");
  if (!clean || !canAddLocation(locations)) return locations;
  if (locations.some((l) => l.label.toLowerCase() === clean.toLowerCase())) return locations;
  const id = `loc-${clean.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return [...locations, { id, label: clean, radius }];
}

export function removeLocation(locations: AlertLocation[], id: string): AlertLocation[] {
  return locations.filter((l) => l.id !== id);
}

/** Alerts that are on need at least one location and one timeframe to mean anything. */
export function validatePrefs(prefs: NotificationPrefs): PrefsErrors {
  if (!prefs.enabled) return {};
  const errors: PrefsErrors = {};
  if (prefs.locations.length === 0) errors.locations = "Add at least one location.";
  if (prefs.timeframes.length === 0) errors.timeframes = "Choose at least one timeframe.";
  return errors;
}

/** Plain-language preview of when the alert would fire. */
export function describePrefs(prefs: NotificationPrefs): string {
  if (!prefs.enabled) return "Alerts are off. You will not be notified.";
  const errors = validatePrefs(prefs);
  if (errors.locations || errors.timeframes) {
    return "Finish your criteria to see how alerts would work.";
  }
  const places = prefs.locations.map((l) => `within ${l.radius} miles of ${l.label}`).join(" or ");
  const times = prefs.timeframes
    .map((id) => TIMEFRAMES.find((t) => t.id === id)!.label.toLowerCase())
    .join(", ");
  return `Notify me when a revival is ${places}, happening: ${times}.`;
}
