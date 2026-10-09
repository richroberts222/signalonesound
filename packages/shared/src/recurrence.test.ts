import { describe, expect, it } from "vitest";

import { MAX_OCCURRENCES, MAX_SERIES_DAYS, daysBetween, expandOccurrences, parseDate } from "./recurrence";

// S3 AC5: weekly, monthly-by-weekday and date-list series produce the right dates.
describe("expandOccurrences", () => {
  it("a single event is just its own date", () => {
    expect(expandOccurrences("2026-10-14", null)).toEqual(["2026-10-14"]);
  });

  it("weekly: the same weekday every week up to and including the end date", () => {
    expect(expandOccurrences("2026-10-14", { kind: "weekly", until: "2026-11-04" })).toEqual(["2026-10-14", "2026-10-21", "2026-10-28", "2026-11-04"]);
    expect(expandOccurrences("2026-10-14", { kind: "weekly", until: "2026-11-03" })).toHaveLength(3);
  });

  it("weekly dates keep the weekday across the year end and a leap year", () => {
    const dates = expandOccurrences("2027-12-22", { kind: "weekly", until: "2028-03-15" });
    expect(dates.slice(0, 3)).toEqual(["2027-12-22", "2027-12-29", "2028-01-05"]);
    expect(dates).toContain("2028-03-01");
    expect(dates.every((d) => new Date(`${d}T00:00:00Z`).getUTCDay() === 3)).toBe(true); // all Wednesdays
  });

  it("monthly by weekday: the same nth weekday each month (the 2nd Sunday)", () => {
    expect(expandOccurrences("2026-10-11", { kind: "monthly_weekday", until: "2027-01-31" })).toEqual(["2026-10-11", "2026-11-08", "2026-12-13", "2027-01-10"]);
  });

  it("monthly by weekday skips a month that has no such weekday (no 5th Friday)", () => {
    // In 2026 only January, May, July and October have five Fridays (July 3 is a Friday, so July 31 is the fifth).
    const dates = expandOccurrences("2026-01-30", { kind: "monthly_weekday", until: "2026-12-31" });
    expect(dates).toEqual(["2026-01-30", "2026-05-29", "2026-07-31", "2026-10-30"]);
    expect(dates.every((d) => new Date(`${d}T00:00:00Z`).getUTCDay() === 5)).toBe(true);
  });

  it("date list: the first date plus the listed dates, sorted, without duplicates, ignoring dates before the first", () => {
    expect(expandOccurrences("2026-10-14", { kind: "dates", dates: ["2026-12-01", "2026-10-21", "2026-10-21", "2026-09-01"] })).toEqual(["2026-10-14", "2026-10-21", "2026-12-01"]);
  });

  it("never creates more than the maximum number of occurrences", () => {
    const weekly = expandOccurrences("2026-01-07", { kind: "weekly", until: "2036-01-01" });
    expect(weekly.length).toBeLessThanOrEqual(MAX_OCCURRENCES);
    expect(daysBetween(weekly[0], weekly[weekly.length - 1])).toBeLessThanOrEqual(MAX_SERIES_DAYS);
    const many = Array.from({ length: 300 }, (_, i) => expandOccurrences("2026-01-01", null) && `2026-${String((i % 12) + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`);
    expect(expandOccurrences("2026-01-01", { kind: "dates", dates: many }).length).toBeLessThanOrEqual(MAX_OCCURRENCES);
  });

  it("rejects impossible dates", () => {
    expect(() => expandOccurrences("2026-02-30", null)).toThrow();
    expect(() => expandOccurrences("2026-10-14", { kind: "weekly", until: "nope" })).toThrow();
    expect(() => expandOccurrences("2026-10-14", { kind: "dates", dates: ["2026-13-01"] })).toThrow();
  });
});

describe("parseDate and daysBetween", () => {
  it("validates real calendar dates", () => {
    expect(parseDate("2028-02-29")).toEqual({ year: 2028, month: 2, day: 29 });
    expect(parseDate("2026-02-29")).toBeNull();
    expect(parseDate("2026-4-5")).toBeNull();
  });

  it("counts whole days", () => {
    expect(daysBetween("2026-10-14", "2026-10-21")).toBe(7);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
  });
});
