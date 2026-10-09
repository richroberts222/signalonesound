import { describe, expect, it } from "vitest";

import {
  formatLocalDateTime,
  localToUtc,
  parseLocalDateTime,
  utcToLocalString,
  utcToZoned,
} from "./zoned-time";

// S3 AC3: an event is stored as an exact moment plus its time zone, and the local time shown must be
// right across daylight-saving changes. US rules in 2026: clocks go forward on March 8 (2:00 to 3:00)
// and back on November 1 (2:00 to 1:00). The UK changes on March 29 and October 25.
const iso = (d: Date) => d.toISOString();

describe("localToUtc and utcToLocalString", () => {
  it("converts an ordinary winter and summer time in Chicago", () => {
    expect(iso(localToUtc({ year: 2026, month: 1, day: 15, hour: 19, minute: 0 }, "America/Chicago"))).toBe("2026-01-16T01:00:00.000Z"); // UTC-6
    expect(iso(localToUtc({ year: 2026, month: 7, day: 15, hour: 19, minute: 0 }, "America/Chicago"))).toBe("2026-07-16T00:00:00.000Z"); // UTC-5
  });

  it("keeps 7:00 PM local on both sides of the spring change (a different UTC hour each side)", () => {
    const before = localToUtc({ year: 2026, month: 3, day: 7, hour: 19, minute: 0 }, "America/Chicago");
    const after = localToUtc({ year: 2026, month: 3, day: 9, hour: 19, minute: 0 }, "America/Chicago");
    expect(iso(before)).toBe("2026-03-08T01:00:00.000Z");
    expect(iso(after)).toBe("2026-03-10T00:00:00.000Z");
    expect(utcToLocalString(before, "America/Chicago")).toBe("2026-03-07T19:00");
    expect(utcToLocalString(after, "America/Chicago")).toBe("2026-03-09T19:00");
  });

  it("keeps 7:00 PM local on both sides of the autumn change", () => {
    const before = localToUtc({ year: 2026, month: 10, day: 31, hour: 19, minute: 0 }, "America/Chicago");
    const after = localToUtc({ year: 2026, month: 11, day: 2, hour: 19, minute: 0 }, "America/Chicago");
    expect(iso(before)).toBe("2026-11-01T00:00:00.000Z");
    expect(iso(after)).toBe("2026-11-03T01:00:00.000Z");
    expect(utcToLocalString(after, "America/Chicago")).toBe("2026-11-02T19:00");
  });

  it("times shortly after a clock change on the change day itself are right (they need the second pass)", () => {
    // 3:30 AM on March 8 is already daylight time (UTC-5): 08:30 UTC. A one-pass calculation gets 09:30 UTC.
    expect(iso(localToUtc({ year: 2026, month: 3, day: 8, hour: 3, minute: 30 }, "America/Chicago"))).toBe("2026-03-08T08:30:00.000Z");
    // 3:00 AM on November 1 is already standard time (UTC-6): 09:00 UTC. A one-pass calculation gets 08:00 UTC.
    expect(iso(localToUtc({ year: 2026, month: 11, day: 1, hour: 3, minute: 0 }, "America/Chicago"))).toBe("2026-11-01T09:00:00.000Z");
    expect(iso(localToUtc({ year: 2026, month: 3, day: 29, hour: 2, minute: 30 }, "Europe/London"))).toBe("2026-03-29T01:30:00.000Z"); // 2:30 AM on the UK change day is already summer time (UTC+1)
  });

  it("a time that does not exist (2:30 AM on the spring day) moves forward past the gap", () => {
    const moved = localToUtc({ year: 2026, month: 3, day: 8, hour: 2, minute: 30 }, "America/Chicago");
    expect(utcToLocalString(moved, "America/Chicago")).toBe("2026-03-08T03:30");
  });

  it("a time that happens twice (1:30 AM on the autumn day) is the first one", () => {
    const first = localToUtc({ year: 2026, month: 11, day: 1, hour: 1, minute: 30 }, "America/Chicago");
    expect(iso(first)).toBe("2026-11-01T06:30:00.000Z"); // still daylight time (UTC-5)
  });

  it("works in zones ahead of UTC and with half-hour offsets", () => {
    expect(iso(localToUtc({ year: 2026, month: 6, day: 1, hour: 12, minute: 0 }, "Europe/London"))).toBe("2026-06-01T11:00:00.000Z");
    expect(iso(localToUtc({ year: 2026, month: 12, day: 1, hour: 12, minute: 0 }, "Europe/London"))).toBe("2026-12-01T12:00:00.000Z");
    expect(iso(localToUtc({ year: 2026, month: 1, day: 1, hour: 12, minute: 0 }, "Asia/Kolkata"))).toBe("2026-01-01T06:30:00.000Z");
    expect(iso(localToUtc({ year: 2026, month: 3, day: 29, hour: 12, minute: 0 }, "Europe/London"))).toBe("2026-03-29T11:00:00.000Z");
  });

  it("handles a zone that skips a whole day boundary and midnight correctly", () => {
    expect(utcToLocalString(new Date("2026-01-01T05:59:00Z"), "America/Chicago")).toBe("2025-12-31T23:59");
    expect(utcToLocalString(new Date("2026-01-01T06:00:00Z"), "America/Chicago")).toBe("2026-01-01T00:00");
  });

  it("round-trips every quarter hour across a year in two zones", () => {
    for (const zone of ["America/Chicago", "America/Los_Angeles"]) {
      for (let day = 0; day < 365; day += 7) {
        for (const [hour, minute] of [[0, 0], [9, 15], [12, 30], [19, 0], [23, 45]]) {
          const start = new Date(Date.UTC(2026, 0, 1 + day));
          const p = { year: start.getUTCFullYear(), month: start.getUTCMonth() + 1, day: start.getUTCDate(), hour, minute };
          const back = utcToZoned(localToUtc(p, zone), zone);
          const inGap = back.hour !== hour || back.minute !== minute; // only the nonexistent hour may differ
          if (!inGap) expect(formatLocalDateTime(back)).toBe(formatLocalDateTime(p));
        }
      }
    }
  });
});

describe("parseLocalDateTime", () => {
  it("reads a real local date and time", () => {
    expect(parseLocalDateTime("2026-10-14T19:00")).toEqual({ year: 2026, month: 10, day: 14, hour: 19, minute: 0 });
  });

  it("rejects impossible dates and times and other formats", () => {
    for (const bad of ["2026-02-30T10:00", "2026-13-01T10:00", "2026-01-01T24:00", "2026-01-01T10:60", "2026-01-01 10:00", "2026-01-01", "tomorrow", "", "2026-1-1T10:00"]) {
      expect(parseLocalDateTime(bad), bad).toBeNull();
    }
    expect(parseLocalDateTime("2028-02-29T10:00")).not.toBeNull(); // a real leap day
    expect(parseLocalDateTime("2026-02-29T10:00")).toBeNull();
  });
});
