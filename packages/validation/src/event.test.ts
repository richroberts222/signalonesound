import { describe, expect, it } from "vitest";

import { COUNTRIES, countryName } from "./countries";
import { addressProblems, createEventSchema, patchEventSchema, pinSchema, placeLabel, storedState } from "./event";

// S17 event location (docs/features/s17-event-location.md): the pin, the country and the address rules by country.

const valid = {
  title: "Sample Revival Night",
  startLocal: "2026-10-14T19:00",
  timeZone: "America/Chicago",
  venueName: "Sample Venue",
  street: "123 Sample Street",
  city: "Nashville",
  state: "TN",
  zip: "37201",
  revivalTypes: ["tent-revivals"],
};

describe("pin", () => {
  it("accepts real coordinates, including the edges", () => {
    for (const p of [{ lat: 36.16, lng: -86.78 }, { lat: 90, lng: 180 }, { lat: -90, lng: -180 }, { lat: 0, lng: 0 }]) expect(pinSchema.safeParse(p).success, JSON.stringify(p)).toBe(true);
  });

  it("refuses out-of-range, missing, text, non-finite and extra values", () => {
    const bad = [{ lat: 90.0001, lng: 0 }, { lat: 0, lng: 180.0001 }, { lat: -91, lng: 0 }, { lat: 5 }, { lat: "5", lng: "6" }, { lat: NaN, lng: 0 }, { lat: Infinity, lng: 0 }, { lat: 0, lng: 0, alt: 1 }, null, "1,2"];
    for (const p of bad) expect(pinSchema.safeParse(p).success, String(JSON.stringify(p))).toBe(false);
  });

  it("says what is wrong in plain words", () => {
    const r = pinSchema.safeParse({ lat: 100, lng: 0 });
    expect(r.success ? "" : r.error.issues[0].message).toBe("Latitude must be between -90 and 90");
  });
});

describe("country list", () => {
  it("starts with the United States, has no repeats, and includes the places people hold gatherings in", () => {
    expect(COUNTRIES[0]).toEqual({ code: "US", name: "United States" });
    expect(new Set(COUNTRIES.map((c) => c.code)).size).toBe(COUNTRIES.length);
    expect(COUNTRIES.length).toBeGreaterThan(190);
    for (const code of ["GB", "KE", "NG", "KR", "BR", "IN", "PH", "MX", "CA", "AU"]) expect(COUNTRIES.some((c) => c.code === code), code).toBe(true);
  });

  it("has no retired or made-up codes", () => {
    for (const code of ["UK", "ZZ", "EU", "SU", "YU", "AN"]) expect(COUNTRIES.some((c) => c.code === code), code).toBe(false);
  });

  it("names a country, and falls back to the code for an unknown one", () => {
    expect(countryName("KE")).toBe("Kenya");
    expect(countryName("QQ")).toBe("QQ");
  });
});

describe("address rules by country", () => {
  it("the United States needs a state and a ZIP", () => {
    expect(addressProblems({ country: "US", state: "TN", zip: "37201" })).toBeNull();
    expect(addressProblems({ country: "US", state: "", zip: "37201" })).toEqual({ state: ["Choose a state"] });
    expect(addressProblems({ country: "US", state: "TN", zip: "" })).toEqual({ zip: ["Enter a 5 or 9 digit ZIP code"] });
    expect(addressProblems({ country: "US", state: "Nairobi County", zip: "abc" })).toEqual({ state: ["Choose a state"], zip: ["Enter a 5 or 9 digit ZIP code"] });
  });

  it("anywhere else needs neither", () => {
    expect(addressProblems({ country: "KE", state: "", zip: "" })).toBeNull();
    expect(addressProblems({ country: "GB", state: "England", zip: "SW1A 1AA" })).toBeNull();
  });

  it("the create schema applies them and defaults to the United States", () => {
    expect(createEventSchema.safeParse(valid).data?.country).toBe("US");
    expect(createEventSchema.safeParse({ ...valid, state: "" }).success).toBe(false);
    expect(createEventSchema.safeParse({ ...valid, country: "KE", state: "", zip: "", region: "Nairobi County" }).success).toBe(true);
    expect(createEventSchema.safeParse({ ...valid, country: "ZZ" }).success).toBe(false);
  });
});

describe("names", () => {
  it("a US place is City, ST and elsewhere it is City, Country", () => {
    expect(placeLabel("Nashville", "TN", "US")).toBe("Nashville, TN");
    expect(placeLabel("Kibera", "Nairobi County", "KE")).toBe("Kibera, Kenya");
  });

  it("the stored state is the US state, or elsewhere the region", () => {
    expect(storedState("US", "TN", "ignored")).toBe("TN");
    expect(storedState("KE", "", "Nairobi County")).toBe("Nairobi County");
    expect(storedState("KE", "", undefined)).toBe("");
  });
});

describe("an edit", () => {
  it("applies no defaults, so a field it leaves out stays as it was", () => {
    const r = patchEventSchema.safeParse({ version: 1, title: "A new title" });
    expect(r.success).toBe(true);
    expect(r.data).toEqual({ version: 1, title: "A new title", scope: "this" });
  });

  it("can set, move or remove the pin", () => {
    expect(patchEventSchema.safeParse({ version: 1, location: { lat: 1, lng: 2 } }).success).toBe(true);
    expect(patchEventSchema.safeParse({ version: 1, location: null }).data?.location).toBeNull();
    expect(patchEventSchema.safeParse({ version: 1, location: { lat: 1, lng: 999 } }).success).toBe(false);
  });
});
