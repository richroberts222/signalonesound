import { describe, expect, it } from "vitest";

import { formatDistance, formatWhen } from "./format";

describe("formatWhen", () => {
  it("shows the event's own weekday, date and time", () => {
    expect(formatWhen("2026-10-14T19:00", null)).toBe("Wed, Oct 14, 7:00 PM");
    expect(formatWhen("2026-12-31T00:05", null)).toBe("Thu, Dec 31, 12:05 AM");
    expect(formatWhen("2026-10-14T12:00", null)).toBe("Wed, Oct 14, 12:00 PM");
  });

  it("adds the end time when the event ends the same day, and omits it otherwise", () => {
    expect(formatWhen("2026-10-14T19:00", "2026-10-14T21:30")).toBe("Wed, Oct 14, 7:00 PM to 9:30 PM");
    expect(formatWhen("2026-10-14T19:00", "2026-10-15T09:00")).toBe("Wed, Oct 14, 7:00 PM");
  });

  it("never crashes on a malformed or impossible value", () => {
    for (const bad of ["", "tomorrow", "2026-02-30T10:00", "2026-13-01T10:00", "2026-10-14T25:00", "2026-10-14 19:00"]) {
      expect(formatWhen(bad, null), bad).toBe("Time to be confirmed");
    }
    expect(formatWhen("2026-10-14T19:00", "garbage")).toBe("Wed, Oct 14, 7:00 PM");
  });
});

describe("formatDistance", () => {
  it("rounds to one decimal and handles no position and very short distances", () => {
    expect(formatDistance(2.449)).toBe("2.4 miles");
    expect(formatDistance(0.04)).toBe("Under 0.1 miles");
    expect(formatDistance(null)).toBeNull();
  });
});
