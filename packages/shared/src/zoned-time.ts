// Wall-clock time in an IANA time zone, without a date library (S3,
// docs/features/s3-events-church-portal.md AC3). An event is stored as an exact moment (UTC) plus the
// zone it happens in, so a 7:00 PM service stays at 7:00 PM local time before and after a daylight-
// saving change. Pure functions; only the standard Intl API is used, so they run unchanged on the
// server, the web and the phone.

export type LocalParts = { year: number; month: number; day: number; hour: number; minute: number };
export type ZonedParts = LocalParts & { second: number; weekday: number };

const formatters = new Map<string, Intl.DateTimeFormat>();
function formatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** The local calendar date and clock time in `timeZone` at the given moment. Weekday: 0 is Sunday. */
export function utcToZoned(date: Date, timeZone: string): ZonedParts {
  const read: Record<string, number> = {};
  for (const part of formatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") read[part.type] = Number(part.value);
  }
  const hour = read.hour === 24 ? 0 : read.hour;
  return {
    year: read.year,
    month: read.month,
    day: read.day,
    hour,
    minute: read.minute,
    second: read.second,
    weekday: new Date(Date.UTC(read.year, read.month - 1, read.day)).getUTCDay(),
  };
}

/** Minutes the zone is ahead of UTC at the given moment (negative in the Americas). */
function offsetMinutes(date: Date, timeZone: string): number {
  const p = utcToZoned(date, timeZone);
  const local = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const wholeSecond = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((local - wholeSecond) / 60000);
}

const sameLocal = (a: ZonedParts, b: LocalParts): boolean =>
  a.year === b.year && a.month === b.month && a.day === b.day && a.hour === b.hour && a.minute === b.minute;

/**
 * The exact moment when the clocks in `timeZone` read `parts`.
 * - A time that happens twice (clocks go back) is the first one.
 * - A time that never happens (clocks go forward) moves forward to the first real time after the gap.
 */
export function localToUtc(parts: LocalParts, timeZone: string): Date {
  const naive = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  const first = naive - offsetMinutes(new Date(naive), timeZone) * 60000;
  const second = naive - offsetMinutes(new Date(first), timeZone) * 60000;
  const matches = [first, second].filter((t) => sameLocal(utcToZoned(new Date(t), timeZone), parts));
  if (matches.length > 0) return new Date(Math.min(...matches));
  return new Date(Math.max(first, second));
}

/** "YYYY-MM-DDTHH:mm" as used by the event forms and the API; null when it is not a real date and time. */
export function parseLocalDateTime(value: string): LocalParts | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  if (month < 1 || month > 12 || hour > 23 || minute > 59) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) return null; // for example February 30
  return { year, month, day, hour, minute };
}

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

export function formatLocalDateTime(p: LocalParts): string {
  return `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** "YYYY-MM-DDTHH:mm" for the moment as it reads on the clocks in `timeZone`. */
export function utcToLocalString(date: Date, timeZone: string): string {
  return formatLocalDateTime(utcToZoned(date, timeZone));
}
