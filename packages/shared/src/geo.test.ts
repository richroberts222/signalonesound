import { describe, expect, it } from "vitest";

import { milesBetween } from "./geo";

describe("milesBetween", () => {
  it("is zero for the same point and symmetric", () => {
    const a = { lat: 36.16, lng: -86.78 };
    const b = { lat: 35.9, lng: -86.87 };
    expect(milesBetween(a, a)).toBe(0);
    expect(milesBetween(a, b)).toBe(milesBetween(b, a));
  });

  it("matches known distances closely (Nashville to Franklin is about 18 miles, to Memphis about 195)", () => {
    expect(milesBetween({ lat: 36.16, lng: -86.78 }, { lat: 35.92, lng: -86.87 })).toBeGreaterThan(16);
    expect(milesBetween({ lat: 36.16, lng: -86.78 }, { lat: 35.92, lng: -86.87 })).toBeLessThan(20);
    expect(milesBetween({ lat: 36.16, lng: -86.78 }, { lat: 35.15, lng: -90.05 })).toBeGreaterThan(190);
    expect(milesBetween({ lat: 36.16, lng: -86.78 }, { lat: 35.15, lng: -90.05 })).toBeLessThan(200);
  });

  it("one degree of latitude is about 69 miles, and it rounds to hundredths", () => {
    expect(milesBetween({ lat: 40, lng: -100 }, { lat: 41, lng: -100 })).toBe(69.09);
  });

  it("never fails on points that are exactly opposite or identical (rounding past 1)", () => {
    expect(Number.isFinite(milesBetween({ lat: 0, lng: 0 }, { lat: 0, lng: 180 }))).toBe(true);
    expect(Number.isFinite(milesBetween({ lat: 89.999999, lng: 10 }, { lat: 89.999999, lng: 10 }))).toBe(true);
  });
});
