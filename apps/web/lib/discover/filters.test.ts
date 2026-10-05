import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  dateRange,
  filterEvents,
  filtersToQuery,
  parseFilters,
  type DiscoverFilters,
} from "./filters";
import { MOCK_EVENTS, MOCK_TODAY, findMockOrigin } from "./mock-data";

const nashville = findMockOrigin("nashville");
const run = (patch: Partial<DiscoverFilters>) =>
  filterEvents(MOCK_EVENTS, { ...DEFAULT_FILTERS, near: "nashville", ...patch }, nashville, MOCK_TODAY);
const ids = (patch: Partial<DiscoverFilters>) => run(patch).map((r) => r.event.id);

describe("Discover Revival filtering (mock)", () => {
  it("limits results to the chosen radius and reports distance", () => {
    const within25 = run({ radius: 25 });
    expect(within25.length).toBeGreaterThan(0);
    expect(within25.every((r) => r.distanceMiles !== null && r.distanceMiles <= 25)).toBe(true);
    // Chattanooga (~118 mi) and Dallas-area events only appear when unlimited.
    expect(ids({ radius: 25 })).not.toContain("chattanooga-awakening-conference");
    expect(ids({ radius: "any" })).toContain("chattanooga-awakening-conference");
    expect(ids({ radius: 50 })).toContain("clarksville-revival-nights");
    expect(ids({ radius: 25 })).not.toContain("clarksville-revival-nights");
  });

  it("matches an event carrying any selected Revival Type", () => {
    const result = ids({ radius: "any", types: ["baptism", "youth"] });
    expect(result).toEqual(
      expect.arrayContaining(["baptism-sunday-hendersonville", "lebanon-youth-ignite"]),
    );
    expect(result).not.toContain("rise-and-sing-worship-night");
  });

  it("includes a multi-day event on any day it runs and excludes it otherwise", () => {
    expect(ids({ radius: 25, date: "2026-10-10" })).toContain("fire-fall-tent-revival-franklin");
    expect(ids({ radius: 25, date: "2026-10-12" })).not.toContain("fire-fall-tent-revival-franklin");
  });

  it("this weekend is Friday through Sunday after a Monday", () => {
    expect(dateRange("weekend", MOCK_TODAY)).toEqual({ start: "2026-10-09", end: "2026-10-11" });
    expect(dateRange("weekend", "2026-10-10")).toEqual({ start: "2026-10-10", end: "2026-10-11" });
    expect(dateRange("weekend", "2026-10-11")).toEqual({ start: "2026-10-11", end: "2026-10-11" });
  });

  it("never returns events that have already ended and sorts soonest first", () => {
    const result = run({ radius: "any" });
    expect(result.every((r) => (r.event.endDate ?? r.event.date) >= MOCK_TODAY)).toBe(true);
    const dates = result.map((r) => r.event.date);
    expect(dates).toEqual([...dates].sort());
    expect(ids({ date: "today", radius: 25 })).toEqual(["monday-night-prayer-nashville"]);
  });
});

describe("filters <-> URL query", () => {
  it("round-trips and omits defaults", () => {
    expect(filtersToQuery(DEFAULT_FILTERS)).toBe("");
    const filters: DiscoverFilters = {
      near: "dallas",
      radius: 50,
      date: "weekend",
      types: ["tent-revival", "worship-night"],
    };
    expect(parseFilters(new URLSearchParams(filtersToQuery(filters)))).toEqual(filters);
  });

  it("ignores unknown or malformed values instead of trusting the URL", () => {
    const parsed = parseFilters(
      new URLSearchParams("near=mars&radius=999&date=someday&types=baptism,bogus,baptism"),
    );
    expect(parsed).toEqual({ ...DEFAULT_FILTERS, types: ["baptism"] });
  });
});
