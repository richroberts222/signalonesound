import { describe, expect, it } from "vitest";
import { INITIAL_PREFS } from "./mock-data";
import {
  MAX_LOCATIONS,
  addLocation,
  describePrefs,
  removeLocation,
  toggleTimeframe,
  validatePrefs,
} from "./preferences";

describe("locations", () => {
  it("adds a trimmed location and ignores blanks and case-insensitive duplicates", () => {
    const added = addLocation(INITIAL_PREFS.locations, "  Dallas,   TX ", 10);
    expect(added.map((l) => l.label)).toEqual(["Nashville, TN", "Dallas, TX"]);
    expect(addLocation(added, "   ", 10)).toBe(added);
    expect(addLocation(added, "dallas, tx", 50)).toBe(added);
  });

  it("stops at the maximum number of locations", () => {
    let locs = INITIAL_PREFS.locations;
    for (const c of ["Tulsa", "Waco", "Plano", "Franklin"]) locs = addLocation(locs, c, 25);
    expect(locs).toHaveLength(MAX_LOCATIONS);
  });

  it("removes by id", () => {
    expect(removeLocation(INITIAL_PREFS.locations, "loc-nashville-tn")).toEqual([]);
  });
});

describe("toggleTimeframe", () => {
  it("toggles and keeps canonical order", () => {
    expect(toggleTimeframe(["next-30-days"], "next-7-days")).toEqual([
      "next-7-days",
      "next-30-days",
    ]);
    expect(toggleTimeframe(["next-7-days"], "next-7-days")).toEqual([]);
  });
});

describe("validatePrefs / describePrefs", () => {
  it("requires a location and a timeframe only while alerts are on", () => {
    const empty = { enabled: true, locations: [], timeframes: [] };
    expect(Object.keys(validatePrefs(empty)).sort()).toEqual(["locations", "timeframes"]);
    expect(validatePrefs({ ...empty, enabled: false })).toEqual({});
  });

  it("describes valid criteria in plain language and the off state", () => {
    expect(describePrefs(INITIAL_PREFS)).toBe(
      "Notify me when a revival is within 25 miles of Nashville, TN, happening: next 30 days.",
    );
    expect(describePrefs({ ...INITIAL_PREFS, enabled: false })).toMatch(/off/);
    expect(describePrefs({ ...INITIAL_PREFS, locations: [] })).toMatch(/Finish/);
  });
});
