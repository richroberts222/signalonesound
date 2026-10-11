import { describe, expect, it } from "vitest";

import usStates from "./data/us-states.json";
import world from "./data/world.json";
import { indexRegions, landAreaSquareMiles, landUnderFireSquareMiles, locate, miles, type Region } from "./geo";
import { outlinePath, pixelsPerMile, projectUs, projectWorld } from "./projection";

// Unit tests for the Fire Map geometry (S16). Known places, known distances and known areas.
const states = indexRegions(usStates as Region[]);
const countries = indexRegions(world as Region[]);

describe("locate", () => {
  it("finds the state and the country of known places", () => {
    expect(locate(states, 36.16, -86.78)?.name).toBe("Tennessee");
    expect(locate(states, 21.31, -157.86)?.name).toBe("Hawaii");
    expect(locate(countries, 51.5, -0.12)?.name).toBe("United Kingdom");
  });
  it("finds nothing on the open ocean", () => {
    expect(locate(countries, 30, -40)).toBeNull();
    expect(locate(states, 30, -40)).toBeNull();
  });
});

describe("miles", () => {
  it("measures a degree of latitude as about 69 miles", () => {
    expect(miles({ lat: 36, lng: -86 }, { lat: 37, lng: -86 })).toBeGreaterThan(68.5);
    expect(miles({ lat: 36, lng: -86 }, { lat: 37, lng: -86 })).toBeLessThan(69.5);
  });
});

describe("land area", () => {
  it("is close to the real figures for the United States and the world (simplified outlines)", () => {
    const us = landAreaSquareMiles(usStates as Region[]);
    expect(us).toBeGreaterThan(3_300_000);
    expect(us).toBeLessThan(4_100_000);
    const all = landAreaSquareMiles(world as Region[]);
    expect(all).toBeGreaterThan(55_000_000);
    expect(all).toBeLessThan(62_000_000);
  });
});

describe("land under fire", () => {
  it("one fire on land is about the area of a ten mile circle", () => {
    const n = landUnderFireSquareMiles([{ lat: 38.5, lng: -98.4 }], states);
    expect(n).toBeGreaterThan(300);
    expect(n).toBeLessThan(330);
  });
  it("the same fire twice, or two fires on top of each other, count once", () => {
    const once = landUnderFireSquareMiles([{ lat: 38.5, lng: -98.4 }], states);
    expect(landUnderFireSquareMiles([{ lat: 38.5, lng: -98.4 }, { lat: 38.5, lng: -98.4 }], states)).toBe(once);
  });
  it("counts nothing for a fire out at sea", () => {
    expect(landUnderFireSquareMiles([{ lat: 30, lng: -40 }], countries)).toBe(0);
  });
});

describe("projection", () => {
  it("puts west left of east and north above south on the world map", () => {
    expect(projectWorld(0, -100).x).toBeLessThan(projectWorld(0, 100).x);
    expect(projectWorld(60, 0).y).toBeLessThan(projectWorld(-30, 0).y);
  });
  it("draws Alaska and Hawaii as insets below the lower 48", () => {
    expect(projectUs(64, -150).y).toBeGreaterThan(projectUs(40, -100).y);
    expect(projectUs(21.3, -157.8).y).toBeGreaterThan(projectUs(40, -100).y);
  });
  it("ten miles is a small but real number of pixels", () => {
    expect(10 * pixelsPerMile("us", 38)).toBeGreaterThan(2);
    expect(10 * pixelsPerMile("us", 38)).toBeLessThan(6);
  });
  it("draws every outline as path data", () => {
    expect(outlinePath("us", usStates as Region[]).startsWith("M")).toBe(true);
  });
});
