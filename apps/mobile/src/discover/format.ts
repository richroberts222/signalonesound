import { parseLocalDateTime } from "@signalone/shared";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function clock(hour: number, minute: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:${String(minute).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
}

/**
 * "Wed, Oct 14, 7:00 PM" (and " to 9:00 PM" when it ends the same day), from the event's own local time
 * string, so it reads the same wherever the phone is. A malformed value shows as "Time to be confirmed"
 * and never crashes the screen.
 */
export function formatWhen(startLocal: string, endLocal: string | null): string {
  const start = parseLocalDateTime(startLocal);
  if (!start) return "Time to be confirmed";
  const weekday = DAYS[new Date(Date.UTC(start.year, start.month - 1, start.day)).getUTCDay()];
  const text = `${weekday}, ${MONTHS[start.month - 1]} ${start.day}, ${clock(start.hour, start.minute)}`;
  const end = endLocal ? parseLocalDateTime(endLocal) : null;
  if (end && end.year === start.year && end.month === start.month && end.day === start.day) return `${text} to ${clock(end.hour, end.minute)}`;
  return text;
}

/** "2.4 miles", or nothing when no position was searched. */
export function formatDistance(miles: number | null): string | null {
  if (miles === null) return null;
  return miles < 0.1 ? "Under 0.1 miles" : `${miles.toFixed(1)} miles`;
}
