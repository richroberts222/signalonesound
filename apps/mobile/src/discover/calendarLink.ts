import type { PublicEvent } from "@signalone/validation";

// "Add to calendar" on the phone (S5). It opens a calendar page that already holds the event, so it needs no
// calendar permission and no extra phone module. Times go in UTC, so every calendar shows them correctly in the
// person's own zone. Plain data with no React Native import, so a test can check it.
const DEFAULT_LENGTH_MS = 2 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

export function calendarLink(event: Pick<PublicEvent, "title" | "description" | "startsAt" | "endsAt" | "venueName" | "street" | "city" | "state" | "zip" | "status">): string {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + DEFAULT_LENGTH_MS);
  const where = [event.venueName, event.street, event.city, [event.state, event.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.status === "cancelled" ? `CANCELLED: ${event.title}` : event.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: event.description,
    location: where,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
