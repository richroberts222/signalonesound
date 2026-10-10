import { describe, expect, it } from "vitest";

import { buildSearchRequest, dateRange } from "./query";

describe("buildSearchRequest", () => {
  const now = new Date(2026, 9, 9, 15, 30);

  it("sends only a rounded position (about 1 km), never the exact coordinates (S5 AC3)", () => {
    const request = buildSearchRequest({ origin: { lat: 36.162664, lng: -86.781602 }, radius: 25, types: [], range: "any" }, now);
    expect(request).toEqual({ lat: 36.16, lng: -86.78, radius: 25 });
    expect(JSON.stringify(request)).not.toMatch(/36\.162|86\.7816/);
  });

  it("sends a radius only together with a position", () => {
    expect(buildSearchRequest({ origin: null, radius: 50, types: [], range: "any" }, now)).toEqual({});
    expect(buildSearchRequest({ origin: { lat: 1.234, lng: 2.345 }, radius: "any", types: [], range: "any" }, now)).toMatchObject({ radius: "any" });
  });

  it("sends the revival types only when some are chosen", () => {
    expect(buildSearchRequest({ origin: null, radius: 25, types: ["baptisms", "worship-nights"], range: "any" }, now)).toEqual({
      types: ["baptisms", "worship-nights"],
    });
  });

  it("includes a date range for the next 7 or 30 days", () => {
    expect(buildSearchRequest({ origin: null, radius: 25, types: [], range: "7d" }, now)).toEqual({ from: "2026-10-09", to: "2026-10-16" });
  });
});

describe("dateRange", () => {
  it("counts days across a month and year end", () => {
    expect(dateRange("30d", new Date(2026, 11, 20))).toEqual({ from: "2026-12-20", to: "2027-01-19" });
    expect(dateRange("7d", new Date(2026, 0, 28))).toEqual({ from: "2026-01-28", to: "2026-02-04" });
  });

  it("has no limit for any time", () => {
    expect(dateRange("any", new Date())).toEqual({});
  });
});
