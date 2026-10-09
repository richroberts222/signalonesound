import { describe, expect, it } from "vitest";

import {
  DIGEST_HOUR,
  MAX_PER_ORG_PER_WEEK,
  inQuietHours,
  nextLocalHour,
  planDelivery,
  sendTimeAfterQuietHours,
  startOfLocalDay,
  type PlanInput,
} from "./policy";

// S7 AC4: quiet hours, the daily immediate cap and the weekly church cap, tested by moving the clock.
// Chicago in October 2026 is UTC-5 until the clocks go back on November 1, then UTC-6.
const CHI = "America/Chicago";
const at = (iso: string) => new Date(iso);
const base = (over: Partial<PlanInput> = {}): PlanInput => ({
  kind: "new_event",
  immediate: false,
  now: at("2026-10-14T17:00:00Z"), // 12:00 noon in Chicago
  timeZone: CHI,
  immediateSentToday: 0,
  orgSentThisWeek: 0,
  ...over,
});

describe("quiet hours (9 pm to 8 am on the member's clock)", () => {
  it("are on at night and early morning, and off during the day", () => {
    expect(inQuietHours(at("2026-10-15T02:00:00Z"), CHI)).toBe(true); // 9:00 PM
    expect(inQuietHours(at("2026-10-15T01:59:00Z"), CHI)).toBe(false); // 8:59 PM
    expect(inQuietHours(at("2026-10-15T12:59:00Z"), CHI)).toBe(true); // 7:59 AM
    expect(inQuietHours(at("2026-10-15T13:00:00Z"), CHI)).toBe(false); // 8:00 AM
    expect(inQuietHours(at("2026-10-14T17:00:00Z"), CHI)).toBe(false); // noon
  });

  it("use the member's own zone: the same moment is quiet in one place and not another", () => {
    const moment = at("2026-10-15T04:00:00Z"); // 11 PM Chicago, 9 PM Los Angeles... 9 PM is quiet too, so use Asia
    expect(inQuietHours(moment, CHI)).toBe(true);
    expect(inQuietHours(moment, "Asia/Kolkata")).toBe(false); // 9:30 AM there
  });

  it("a time-sensitive message waits until 8 am, and goes at once in the daytime", () => {
    expect(sendTimeAfterQuietHours(at("2026-10-15T04:00:00Z"), CHI).toISOString()).toBe("2026-10-15T13:00:00.000Z"); // 11 PM -> 8 AM
    expect(sendTimeAfterQuietHours(at("2026-10-15T09:00:00Z"), CHI).toISOString()).toBe("2026-10-15T13:00:00.000Z"); // 4 AM -> 8 AM
    const noon = at("2026-10-14T17:00:00Z");
    expect(sendTimeAfterQuietHours(noon, CHI)).toEqual(noon);
  });

  it("8 am after the clocks go back is one hour later in UTC", () => {
    expect(sendTimeAfterQuietHours(at("2026-11-02T05:00:00Z"), CHI).toISOString()).toBe("2026-11-02T14:00:00.000Z"); // UTC-6 now
  });
});

describe("nextLocalHour and startOfLocalDay", () => {
  it("finds the next 9 am: later today if it has not happened, otherwise tomorrow", () => {
    expect(nextLocalHour(at("2026-10-14T12:00:00Z"), CHI, 9).toISOString()).toBe("2026-10-14T14:00:00.000Z"); // 7 AM -> 9 AM today
    expect(nextLocalHour(at("2026-10-14T14:00:00Z"), CHI, 9).toISOString()).toBe("2026-10-15T14:00:00.000Z"); // exactly 9 AM -> tomorrow
    expect(nextLocalHour(at("2026-10-14T20:00:00Z"), CHI, 9).toISOString()).toBe("2026-10-15T14:00:00.000Z");
  });

  it("keeps 9 am local across a clock change", () => {
    // Saturday evening, October 31 (UTC-5). Clocks go back at 2 AM on November 1, so 9 AM that day is UTC-6.
    expect(nextLocalHour(at("2026-10-31T20:00:00Z"), CHI, 9).toISOString()).toBe("2026-11-01T15:00:00.000Z");
    expect(nextLocalHour(at("2026-11-01T16:00:00Z"), CHI, 9).toISOString()).toBe("2026-11-02T15:00:00.000Z");
  });

  it("the start of the member's day is midnight on their clock", () => {
    expect(startOfLocalDay(at("2026-10-14T17:00:00Z"), CHI).toISOString()).toBe("2026-10-14T05:00:00.000Z");
    expect(startOfLocalDay(at("2026-10-14T03:00:00Z"), CHI).toISOString()).toBe("2026-10-13T05:00:00.000Z"); // still the 13th in Chicago
  });
});

describe("planDelivery for a new event", () => {
  it("goes in the daily digest at 9 am by default", () => {
    const plan = planDelivery(base());
    expect(plan).toEqual({ action: "send", at: at("2026-10-15T14:00:00Z"), channel: "digest" });
  });

  it("an immediate member gets the first alert of the day at once, and the rest in the digest", () => {
    expect(planDelivery(base({ immediate: true }))).toEqual({ action: "send", at: at("2026-10-14T17:00:00Z"), channel: "now" });
    expect(planDelivery(base({ immediate: true, immediateSentToday: 1 }))).toMatchObject({ action: "send", channel: "digest" });
  });

  it("an immediate alert during quiet hours waits for 8 am", () => {
    const plan = planDelivery(base({ immediate: true, now: at("2026-10-15T05:30:00Z") })); // 12:30 AM
    expect(plan).toEqual({ action: "send", at: at("2026-10-15T13:00:00Z"), channel: "now" });
  });

  it("the weekly cap per church drops the fourth alert, whatever the delivery choice", () => {
    for (const immediate of [false, true]) {
      expect(planDelivery(base({ immediate, orgSentThisWeek: MAX_PER_ORG_PER_WEEK - 1 })).action).toBe("send");
      expect(planDelivery(base({ immediate, orgSentThisWeek: MAX_PER_ORG_PER_WEEK }))).toEqual({ action: "drop", reason: "org_weekly_cap" });
    }
  });

  it("the digest hour is 9 in the member's own zone", () => {
    const west = planDelivery(base({ timeZone: "America/Los_Angeles" }));
    expect(west).toMatchObject({ action: "send", channel: "digest" });
    expect(west.action === "send" && west.at.toISOString()).toBe("2026-10-15T16:00:00.000Z"); // 9 AM PDT
    expect(DIGEST_HOUR).toBe(9);
  });
});

describe("planDelivery for time-sensitive messages", () => {
  it("a reminder or a change is not capped, but still waits out quiet hours", () => {
    for (const kind of ["reminder", "event_changed"] as const) {
      const capped = planDelivery(base({ kind, immediateSentToday: 5, orgSentThisWeek: 50 }));
      expect(capped).toEqual({ action: "send", at: at("2026-10-14T17:00:00Z"), channel: "now" });
      const night = planDelivery(base({ kind, now: at("2026-10-15T03:00:00Z"), orgSentThisWeek: 50 }));
      expect(night).toEqual({ action: "send", at: at("2026-10-15T13:00:00Z"), channel: "now" });
    }
  });
});
