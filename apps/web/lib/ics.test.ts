import { describe, expect, it } from "vitest";

import { buildIcs, escapeIcsText, foldIcsLine } from "./ics";

// S4: the "add to calendar" file must be a valid, safe calendar entry for any event text.
const event = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Revival Night, Part 1; Worship",
  description: "Line one\nLine two",
  startsAt: "2026-10-15T00:00:00.000Z",
  endsAt: "2026-10-15T02:30:00.000Z",
  venueName: "Sample Hall",
  street: "1 Main St",
  city: "Nashville",
  state: "TN",
  zip: "37201",
  cancelled: false,
};

describe("buildIcs", () => {
  const ics = buildIcs(event, new Date("2026-10-09T12:00:00Z"));

  it("is a calendar with one event, in UTC, with CRLF line endings", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("DTSTART:20261015T000000Z");
    expect(ics).toContain("DTEND:20261015T023000Z");
    expect(ics).toContain("DTSTAMP:20261009T120000Z");
    expect(ics).toContain("STATUS:CONFIRMED");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics.replace(/\r\n/g, "").includes("\n")).toBe(false);
  });

  it("escapes commas, semicolons and line breaks in the text", () => {
    expect(ics).toContain("SUMMARY:Revival Night\\, Part 1\\; Worship");
    expect(ics).toContain("DESCRIPTION:Line one\\nLine two");
  });

  it("an event without an end lasts two hours, and a cancelled event says so", () => {
    const open = buildIcs({ ...event, endsAt: null, cancelled: true }, new Date("2026-10-09T12:00:00Z"));
    expect(open).toContain("DTEND:20261015T020000Z");
    expect(open).toContain("STATUS:CANCELLED");
  });

  it("text cannot start a new calendar field (no injected lines), even with a lone carriage return", () => {
    for (const title of ["x\r\nBEGIN:VEVENT\r\nATTENDEE:evil", "x\rATTENDEE:evil", "x\nATTENDEE:evil"]) {
      const file = buildIcs({ ...event, title });
      expect(file.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/); // only proper CRLF line endings, no stray line breaks
      const lines = file.split("\r\n");
      expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
      expect(lines.some((l) => l.startsWith("ATTENDEE"))).toBe(false);
    }
  });
});

describe("escapeIcsText and foldIcsLine", () => {
  it("escapes backslashes first", () => {
    expect(escapeIcsText("a\\b;c,d")).toBe("a\\\\b\\;c\\,d");
  });

  it("folds long lines at 75 characters and keeps the content", () => {
    const long = `SUMMARY:${"x".repeat(200)}`;
    const folded = foldIcsLine(long);
    expect(folded.split("\r\n").every((l) => l.length <= 76)).toBe(true);
    expect(folded.replace(/\r\n /g, "")).toBe(long);
  });
});
