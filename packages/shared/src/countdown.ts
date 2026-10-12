// "Revival Countdown" (product plan, Phase 2): how soon an event is, in plain words, so a person feels it coming.
// Pure and shared, so the web and the phone say the same thing. It uses only the event's own start and end moments, so
// it is right wherever the viewer is.
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** An event with no end is treated as about two hours long, as everywhere else. */
const DEFAULT_LENGTH_MS = 2 * HOUR;

export type CountdownInput = { startsAt: string | Date; endsAt: string | Date | null; cancelled?: boolean };

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * "Starts in 3 days", "Starts in 5 hours", "Starts in 20 minutes", "Happening now", or null when there is nothing
 * worth saying (the event is over, or cancelled). A day is 24 hours from now, rounded down, so "Starts in 1 day" never
 * appears for something 30 hours away.
 */
export function countdownText(event: CountdownInput, now: Date): string | null {
  if (event.cancelled) return null;
  const start = new Date(event.startsAt).getTime();
  const end = event.endsAt ? new Date(event.endsAt).getTime() : start + DEFAULT_LENGTH_MS;
  const t = now.getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  if (t >= end) return null;
  if (t >= start) return "Happening now";
  const left = start - t;
  if (left >= DAY) return `Starts in ${plural(Math.floor(left / DAY), "day")}`;
  if (left >= HOUR) return `Starts in ${plural(Math.floor(left / HOUR), "hour")}`;
  return `Starts in ${plural(Math.max(1, Math.floor(left / MINUTE)), "minute")}`;
}
