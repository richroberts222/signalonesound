import type { MockEvent, MockVenue } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parts(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return { m: m - 1, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** "Fri, Oct 9" */
export function formatDay(ymd: string): string {
  const { m, d, dow } = parts(ymd);
  return `${DAYS[dow]}, ${MONTHS[m]} ${d}`;
}

/** "7:30 PM" */
export function formatTime(hhmm: string): string {
  const [h, min] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** "Thu, Oct 8 – Sun, Oct 11" or "Fri, Oct 9" */
export function formatDateSpan(event: Pick<MockEvent, "date" | "endDate">): string {
  return event.endDate && event.endDate !== event.date
    ? `${formatDay(event.date)} – ${formatDay(event.endDate)}`
    : formatDay(event.date);
}

/** "7:00 PM – 9:30 PM" or "7:00 PM" */
export function formatTimeSpan(event: Pick<MockEvent, "startTime" | "endTime">): string {
  return event.endTime
    ? `${formatTime(event.startTime)} – ${formatTime(event.endTime)}`
    : formatTime(event.startTime);
}

export function formatCityState(venue: Pick<MockVenue, "city" | "state">): string {
  return `${venue.city}, ${venue.state}`;
}

export function formatAddress(venue: MockVenue): string {
  return `${venue.street}, ${venue.city}, ${venue.state} ${venue.zip}`;
}

export function formatMiles(miles: number): string {
  return miles < 10 ? `${miles.toFixed(1)} mi` : `${Math.round(miles)} mi`;
}

/** Real Google Maps directions link to the venue address (opens in a new tab). */
export function directionsUrl(venue: MockVenue): string {
  const destination = encodeURIComponent(`${venue.name}, ${formatAddress(venue)}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}
