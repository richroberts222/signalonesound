import { describe, expect, it } from "vitest";

import { countdownText } from "./countdown";

const start = "2026-10-20T00:00:00.000Z";
const end = "2026-10-20T03:00:00.000Z";
const at = (iso: string) => new Date(iso);

describe("the event countdown", () => {
  it("counts whole days, then hours, then minutes, rounding down", () => {
    expect(countdownText({ startsAt: start, endsAt: end }, at("2026-10-17T00:00:00Z"))).toBe("Starts in 3 days");
    expect(countdownText({ startsAt: start, endsAt: end }, at("2026-10-18T18:00:00Z"))).toBe("Starts in 1 day"); // 30 hours away
    expect(countdownText({ startsAt: start, endsAt: end }, at("2026-10-19T19:00:00Z"))).toBe("Starts in 5 hours");
    expect(countdownText({ startsAt: start, endsAt: end }, at("2026-10-19T23:00:00Z"))).toBe("Starts in 1 hour");
    expect(countdownText({ startsAt: start, endsAt: end }, at("2026-10-19T23:40:00Z"))).toBe("Starts in 20 minutes");
    expect(countdownText({ startsAt: start, endsAt: end }, at("2026-10-19T23:59:50Z"))).toBe("Starts in 1 minute");
  });

  it("says happening now from the start until the end, then nothing", () => {
    expect(countdownText({ startsAt: start, endsAt: end }, at(start))).toBe("Happening now");
    expect(countdownText({ startsAt: start, endsAt: end }, at("2026-10-20T02:59:59Z"))).toBe("Happening now");
    expect(countdownText({ startsAt: start, endsAt: end }, at(end))).toBeNull();
  });

  it("treats an event with no end as two hours long", () => {
    expect(countdownText({ startsAt: start, endsAt: null }, at("2026-10-20T01:59:00Z"))).toBe("Happening now");
    expect(countdownText({ startsAt: start, endsAt: null }, at("2026-10-20T02:00:00Z"))).toBeNull();
  });

  it("says nothing for a cancelled event or a malformed time", () => {
    expect(countdownText({ startsAt: start, endsAt: end, cancelled: true }, at("2026-10-17T00:00:00Z"))).toBeNull();
    expect(countdownText({ startsAt: "not a date", endsAt: null }, at("2026-10-17T00:00:00Z"))).toBeNull();
  });
});
