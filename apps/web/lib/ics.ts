// A calendar file (.ics, RFC 5545) for one event, built on the device so the server is not involved.
// Times are written in UTC, so every calendar app shows them correctly in the person's own zone.

const pad = (n: number) => String(n).padStart(2, "0");
const stamp = (d: Date) =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

/** Escapes text for a calendar value: backslash, semicolon, comma and line breaks. */
export function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n|\r|\n/g, "\\n");
}

/** Folds a line to 75 characters, continuing on lines that start with one space. */
export function foldIcsLine(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

export type IcsEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  venueName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  cancelled: boolean;
};

const DEFAULT_LENGTH_MS = 2 * 60 * 60 * 1000;

export function buildIcs(e: IcsEvent, now: Date = new Date()): string {
  const start = new Date(e.startsAt);
  const end = e.endsAt ? new Date(e.endsAt) : new Date(start.getTime() + DEFAULT_LENGTH_MS);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Signal One Sound//Events//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${e.id}@signalonesound`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeIcsText(e.title)}`,
    `LOCATION:${escapeIcsText(`${e.venueName}, ${e.street}, ${e.city}, ${e.state} ${e.zip}`)}`,
    ...(e.description ? [`DESCRIPTION:${escapeIcsText(e.description)}`] : []),
    `STATUS:${e.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`;
}
