// Recurring events (S3, docs/features/s3-events-church-portal.md AC5). A recurrence is expanded into
// plain calendar dates; each date then becomes its own event row, with the same local time of day, so
// search, saves and alerts work on ordinary events. Pure functions on calendar dates ("YYYY-MM-DD"),
// with no time zones involved: the time of day is applied later, per date, in the event's zone.

/** At most this many occurrences are created for one series. */
export const MAX_OCCURRENCES = 104;
/** A series may not reach further than this many days after its first date (about two years). */
export const MAX_SERIES_DAYS = 731;

export type RecurrenceRule =
  | { kind: "weekly"; until: string }
  | { kind: "monthly_weekday"; until: string }
  | { kind: "dates"; dates: string[] };

type YMD = { year: number; month: number; day: number };

export function parseDate(value: string): YMD | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [year, month, day] = m.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > new Date(Date.UTC(year, month, 0)).getUTCDate()) return null;
  return { year, month, day };
}

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
const format = (p: YMD) => `${pad(p.year, 4)}-${pad(p.month)}-${pad(p.day)}`;
const toDays = (p: YMD) => Math.floor(Date.UTC(p.year, p.month - 1, p.day) / 86_400_000);
const fromDays = (d: number): YMD => {
  const t = new Date(d * 86_400_000);
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
};
const weekdayOf = (p: YMD) => new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();

/** Whole days from `a` to `b` (both "YYYY-MM-DD"). */
export function daysBetween(a: string, b: string): number {
  const pa = parseDate(a);
  const pb = parseDate(b);
  if (!pa || !pb) throw new Error("invalid date");
  return toDays(pb) - toDays(pa);
}

/** The calendar date `days` after (or before, if negative) the given "YYYY-MM-DD". */
export function addDays(date: string, days: number): string {
  const p = parseDate(date);
  if (!p) throw new Error("invalid date");
  return format(fromDays(toDays(p) + days));
}

/**
 * The calendar dates of a series, first date included, sorted, without duplicates, at most
 * MAX_OCCURRENCES and never beyond MAX_SERIES_DAYS after the first date.
 *   weekly           the same weekday every week up to `until`
 *   monthly_weekday  the same "nth weekday" each month (for example the 2nd Sunday); a month without
 *                    one (no 5th Friday) is skipped
 *   dates            the first date plus the listed dates
 */
export function expandOccurrences(firstDate: string, rule: RecurrenceRule | null): string[] {
  const first = parseDate(firstDate);
  if (!first) throw new Error("invalid first date");
  const firstDay = toDays(first);
  const limit = firstDay + MAX_SERIES_DAYS;
  const out = new Set<string>([firstDate]);

  if (rule?.kind === "weekly") {
    const until = parseDate(rule.until);
    if (!until) throw new Error("invalid until date");
    const end = Math.min(toDays(until), limit);
    for (let day = firstDay + 7; day <= end && out.size < MAX_OCCURRENCES; day += 7) out.add(format(fromDays(day)));
  } else if (rule?.kind === "monthly_weekday") {
    const until = parseDate(rule.until);
    if (!until) throw new Error("invalid until date");
    const end = Math.min(toDays(until), limit);
    const weekday = weekdayOf(first);
    const nth = Math.ceil(first.day / 7);
    for (let step = 1; out.size < MAX_OCCURRENCES; step++) {
      const monthIndex = first.year * 12 + (first.month - 1) + step;
      const year = Math.floor(monthIndex / 12);
      const month = (monthIndex % 12) + 1;
      if (toDays({ year, month, day: 1 }) > end) break;
      const firstWeekday = weekdayOf({ year, month, day: 1 });
      const day = 1 + ((weekday - firstWeekday + 7) % 7) + (nth - 1) * 7;
      if (day > new Date(Date.UTC(year, month, 0)).getUTCDate()) continue; // no such weekday this month
      const candidate = toDays({ year, month, day });
      if (candidate <= end) out.add(format(fromDays(candidate)));
    }
  } else if (rule?.kind === "dates") {
    for (const value of rule.dates) {
      const p = parseDate(value);
      if (!p) throw new Error("invalid date in list");
      const d = toDays(p);
      if (d >= firstDay && d <= limit && out.size < MAX_OCCURRENCES) out.add(value);
    }
  }
  return [...out].sort().slice(0, MAX_OCCURRENCES);
}
