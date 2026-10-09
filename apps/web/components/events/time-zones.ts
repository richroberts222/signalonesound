// The time zones a Phase 1 (United States) event can happen in, with plain labels.
export const EVENT_TIME_ZONES = [
  { value: "America/New_York", label: "Eastern time" },
  { value: "America/Chicago", label: "Central time" },
  { value: "America/Denver", label: "Mountain time" },
  { value: "America/Phoenix", label: "Arizona (no daylight saving)" },
  { value: "America/Los_Angeles", label: "Pacific time" },
  { value: "America/Anchorage", label: "Alaska time" },
  { value: "Pacific/Honolulu", label: "Hawaii time" },
] as const;

/** The device's own zone if it is one of the choices, otherwise Central time. */
export function defaultTimeZone(): string {
  try {
    const own = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (EVENT_TIME_ZONES.some((z) => z.value === own)) return own;
  } catch {
    // fall through
  }
  return "America/Chicago";
}
