// The quick date choices on the search screen ("today", "this weekend", "next 7 days"...). They are
// worked out on the device, from the device's own calendar, into plain calendar dates, so the server
// never needs to know the searcher's time zone (S4 AC4).
export type DatePreset = "any" | "today" | "weekend" | "week" | "month" | "custom";

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  any: "Any date",
  today: "Today",
  weekend: "This weekend",
  week: "Next 7 days",
  month: "Next 30 days",
  custom: "Choose dates",
};

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** First and last calendar date (YYYY-MM-DD) of a preset, or null for "any date" and "choose dates". */
export function presetRange(preset: DatePreset, today: Date = new Date()): { from: string; to: string } | null {
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  switch (preset) {
    case "today":
      return { from: ymd(day), to: ymd(day) };
    case "weekend": {
      // Friday to Sunday. From Friday on, this weekend; before that, the coming one. On Saturday and
      // Sunday the weekend has started, so it runs from today to Sunday.
      const weekday = day.getDay(); // 0 is Sunday
      const friday = weekday === 0 ? addDays(day, -2) : addDays(day, 5 - weekday);
      const start = weekday === 0 || weekday === 6 ? day : friday;
      const sunday = weekday === 0 ? day : addDays(day, 7 - weekday);
      return { from: ymd(start), to: ymd(sunday) };
    }
    case "week":
      return { from: ymd(day), to: ymd(addDays(day, 6)) };
    case "month":
      return { from: ymd(day), to: ymd(addDays(day, 29)) };
    default:
      return null;
  }
}
