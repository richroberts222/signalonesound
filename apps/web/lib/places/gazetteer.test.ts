import { describe, expect, it } from "vitest";

import { findPlaces, findZip, locateAddress, searchPlaces } from "./gazetteer";
import { normalizePlaceName, parsePlaceQuery, placeKeys } from "./place-name";

// S4 AC6: a typed ZIP code, city and state, or city is turned into a position, offline.
const near = (a: { lat: number; lng: number }, lat: number, lng: number, degrees = 0.2) =>
  Math.abs(a.lat - lat) < degrees && Math.abs(a.lng - lng) < degrees;

describe("place names", () => {
  it("removes the official designation and punctuation", () => {
    expect(normalizePlaceName("Nashville-Davidson metropolitan government (balance)")).toBe("nashville davidson");
    expect(normalizePlaceName("St. Louis city")).toBe("st louis");
    expect(normalizePlaceName("Abanda CDP")).toBe("abanda");
    expect(normalizePlaceName("O'Fallon city")).toBe("ofallon");
    expect(normalizePlaceName("  Winston-Salem  ")).toBe("winston salem");
  });

  it("a hyphenated official name is also found by its first part, and saint/st spellings both work", () => {
    expect(placeKeys("Nashville-Davidson metropolitan government (balance)")).toEqual(expect.arrayContaining(["nashville davidson", "nashville"]));
    expect(placeKeys("St. Louis city")).toEqual(expect.arrayContaining(["st louis", "saint louis"]));
  });

  it("reads ZIP codes, 'City', 'City, ST', 'City ST' and 'City, State name'", () => {
    expect(parsePlaceQuery("37201")).toEqual({ kind: "zip", zip: "37201" });
    expect(parsePlaceQuery("37201-1234")).toEqual({ kind: "zip", zip: "37201" });
    expect(parsePlaceQuery("Nashville")).toEqual({ kind: "city", name: "nashville", state: null });
    expect(parsePlaceQuery("Nashville, TN")).toEqual({ kind: "city", name: "nashville", state: "TN" });
    expect(parsePlaceQuery("nashville tn")).toEqual({ kind: "city", name: "nashville", state: "TN" });
    expect(parsePlaceQuery("Nashville, Tennessee")).toEqual({ kind: "city", name: "nashville", state: "TN" });
    expect(parsePlaceQuery("Winston Salem North Carolina")).toEqual({ kind: "city", name: "winston salem", state: "NC" });
  });

  it("refuses text that is not a place", () => {
    for (const bad of ["", "   ", "12", "12345678", "1 Main St 37201", "a,b,c", "x".repeat(101)]) expect(parsePlaceQuery(bad), bad).toBeNull();
  });
});

describe("gazetteer lookups (Census data shipped with the app)", () => {
  it("finds a ZIP code's centre", () => {
    const nashville = findZip("37201");
    expect(nashville && near(nashville, 36.16, -86.78)).toBe(true);
    expect(findZip("99999")).toBeNull();
    expect(findZip("00000")).toBeNull();
  });

  it("finds a city with its state, by official or common name", () => {
    expect(searchPlaces("Nashville, TN")[0]).toMatchObject({ state: "TN" });
    const nashville = searchPlaces("nashville tn")[0];
    expect(near(nashville, 36.17, -86.78, 0.3)).toBe(true);
    expect(near(searchPlaces("St. Louis, MO")[0], 38.63, -90.24, 0.3)).toBe(true);
    expect(near(searchPlaces("Saint Louis MO")[0], 38.63, -90.24, 0.3)).toBe(true);
    expect(near(searchPlaces("Winston-Salem, NC")[0], 36.1, -80.26, 0.3)).toBe(true);
    expect(near(searchPlaces("Franklin, Tennessee")[0], 35.9, -86.87, 0.3)).toBe(true);
  });

  it("a city name without a state lists the candidates, the largest first", () => {
    const springfield = searchPlaces("Springfield");
    expect(springfield.length).toBeGreaterThan(1);
    expect(new Set(springfield.map((p) => p.state)).size).toBeGreaterThan(1);
  });

  it("an unknown place or an unknown ZIP finds nothing", () => {
    expect(searchPlaces("Zzyzzx, TN")).toEqual([]);
    expect(searchPlaces("00000")).toEqual([]);
    expect(findPlaces("nashville", "ZZ")).toEqual([]);
  });

  it("an event address is located by its ZIP, then by its city and state", () => {
    expect(near(locateAddress({ city: "Nashville", state: "TN", zip: "37201" })!, 36.16, -86.78)).toBe(true);
    expect(near(locateAddress({ city: "Nashville", state: "TN", zip: "00000" })!, 36.17, -86.78, 0.3)).toBe(true);
    expect(locateAddress({ city: "Nowhereville", state: "TN", zip: "00000" })).toBeNull();
  });
});
