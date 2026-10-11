import { describe, expect, it } from "vitest";

import {
  MAX_SERVICES,
  churchPlace,
  churchSearchQuerySchema,
  directionsUrl,
  formatServiceTime,
  formatServiceWhen,
  nextServices,
  saveChurchProfileSchema,
  saveServicesSchema,
  serviceSchema,
  sortServices,
} from "./church";

// S18 Find a Church (docs/features/s18-find-a-church.md): the contracts and the pure logic shared by web and phone.
const svc = (weekday: number, startTime: string, label = "Worship") => ({ weekday, startTime, label, note: "" });

describe("a service", () => {
  it("accepts a day, a 24 hour time, a name and an optional note", () => {
    expect(serviceSchema.safeParse({ weekday: 0, startTime: "10:00", label: "Sunday worship" }).data).toEqual({ weekday: 0, startTime: "10:00", label: "Sunday worship", note: "" });
    expect(serviceSchema.safeParse({ weekday: 6, startTime: "23:59", label: "Late", note: "Childcare provided" }).success).toBe(true);
    expect(serviceSchema.safeParse({ weekday: 3, startTime: "00:00", label: "Midnight prayer" }).success).toBe(true);
  });

  it("refuses a day out of range, a bad time, an empty or long name, long notes and unknown fields", () => {
    for (const bad of [
      { weekday: 7, startTime: "10:00", label: "x" },
      { weekday: -1, startTime: "10:00", label: "x" },
      { weekday: 1.5, startTime: "10:00", label: "x" },
      { weekday: "1", startTime: "10:00", label: "x" },
      { weekday: 1, startTime: "24:00", label: "x" },
      { weekday: 1, startTime: "10:60", label: "x" },
      { weekday: 1, startTime: "9:00", label: "x" },
      { weekday: 1, startTime: "10:00 AM", label: "x" },
      { weekday: 1, startTime: "10:00", label: "" },
      { weekday: 1, startTime: "10:00", label: "   " },
      { weekday: 1, startTime: "10:00", label: "x".repeat(61) },
      { weekday: 1, startTime: "10:00", label: "bad\nline" },
      { weekday: 1, startTime: "10:00", label: "x", note: "n".repeat(201) },
      { weekday: 1, startTime: "10:00", label: "x", extra: true },
    ]) {
      expect(serviceSchema.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
  });
});

describe("saving services", () => {
  it("allows up to 20 and refuses a 21st", () => {
    const twenty = Array.from({ length: MAX_SERVICES }, (_, i) => svc(i % 7, `${String(8 + (i % 10)).padStart(2, "0")}:00`, `Service ${i}`));
    expect(saveServicesSchema.safeParse({ services: twenty }).success).toBe(true);
    expect(saveServicesSchema.safeParse({ services: [...twenty, svc(1, "20:00", "One more")] }).success).toBe(false);
    expect(saveServicesSchema.safeParse({ services: [] }).success).toBe(true); // a church may clear its list
  });

  it("refuses the same service listed twice, whatever the capitals, and says which one", () => {
    const r = saveServicesSchema.safeParse({ services: [svc(0, "10:00", "Worship"), svc(0, "10:00", "WORSHIP")] });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["services", 1]);
    expect(saveServicesSchema.safeParse({ services: [svc(0, "10:00", "Worship"), svc(0, "10:00", "Prayer")] }).success).toBe(true);
  });
});

describe("a church profile", () => {
  const valid = { street: "1 Main St", city: "Springfield", state: "MO", zip: "65801", timeZone: "America/Chicago" };

  it("a US church needs a state and ZIP, and defaults to the United States", () => {
    expect(saveChurchProfileSchema.safeParse(valid).data?.country).toBe("US");
    expect(saveChurchProfileSchema.safeParse({ ...valid, state: "" }).success).toBe(false);
    expect(saveChurchProfileSchema.safeParse({ ...valid, zip: "" }).success).toBe(false);
  });

  it("a house church may leave the street blank, and a church elsewhere needs no state or ZIP", () => {
    expect(saveChurchProfileSchema.safeParse({ ...valid, street: "" }).success).toBe(true);
    expect(saveChurchProfileSchema.safeParse({ city: "Kibera", country: "KE", region: "Nairobi County", timeZone: "Africa/Nairobi" }).success).toBe(true);
  });

  it("checks the time zone, the country and the pin", () => {
    expect(saveChurchProfileSchema.safeParse({ ...valid, timeZone: "Mars/Olympus" }).success).toBe(false);
    expect(saveChurchProfileSchema.safeParse({ ...valid, country: "ZZ" }).success).toBe(false);
    expect(saveChurchProfileSchema.safeParse({ ...valid, location: { lat: 37.2, lng: -93.3 } }).success).toBe(true);
    expect(saveChurchProfileSchema.safeParse({ ...valid, location: { lat: 91, lng: 0 } }).success).toBe(false);
    expect(saveChurchProfileSchema.safeParse({ ...valid, location: null }).success).toBe(true);
    expect(saveChurchProfileSchema.safeParse({ ...valid, orgId: "x" }).success).toBe(false); // unknown fields are refused
  });
});

describe("church search query", () => {
  it("needs both lat and lng or neither, and keeps the radius and page size sensible", () => {
    expect(churchSearchQuerySchema.safeParse({ lat: "36.1", lng: "-86.7" }).success).toBe(true);
    expect(churchSearchQuerySchema.safeParse({ lat: "36.1" }).success).toBe(false);
    expect(churchSearchQuerySchema.safeParse({}).data).toMatchObject({ radius: 25, limit: 20 });
    expect(churchSearchQuerySchema.safeParse({ radius: "100000" }).success).toBe(false);
    expect(churchSearchQuerySchema.safeParse({ limit: "500" }).success).toBe(false);
    expect(churchSearchQuerySchema.safeParse({ q: "x".repeat(101) }).success).toBe(false);
  });
});

describe("showing times", () => {
  it("writes times the way people say them, including noon and midnight", () => {
    expect(formatServiceTime("10:00")).toBe("10:00 AM");
    expect(formatServiceTime("19:30")).toBe("7:30 PM");
    expect(formatServiceTime("12:00")).toBe("12:00 PM");
    expect(formatServiceTime("00:15")).toBe("12:15 AM");
    expect(formatServiceTime("nonsense")).toBe("nonsense");
    expect(formatServiceWhen(0, "10:00")).toBe("Sunday, 10:00 AM");
    expect(formatServiceWhen(3, "19:00")).toBe("Wednesday, 7:00 PM");
  });

  it("orders services Sunday first, then by time, then by name", () => {
    const sorted = sortServices([svc(3, "19:00", "Prayer"), svc(0, "18:00", "Evening"), svc(0, "10:00", "Worship"), svc(0, "10:00", "Kids")]);
    expect(sorted.map((s) => `${s.weekday} ${s.startTime} ${s.label}`)).toEqual(["0 10:00 Kids", "0 10:00 Worship", "0 18:00 Evening", "3 19:00 Prayer"]);
  });

  it("names a place as City, ST in the United States and City, Country elsewhere", () => {
    expect(churchPlace("Springfield", "MO", "US")).toBe("Springfield, MO");
    expect(churchPlace("Kibera", "Nairobi County", "KE")).toBe("Kibera, Kenya");
  });

  it("links directions to the pin when there is one, else to the written address", () => {
    expect(directionsUrl({ street: "1 Main St", city: "Springfield", state: "MO", zip: "65801", country: "US", location: { lat: 37.2, lng: -93.3 } })).toContain("query=37.2%2C-93.3");
    const written = directionsUrl({ street: "", city: "Springfield", state: "MO", zip: "65801", country: "US", location: null });
    expect(decodeURIComponent(written)).toContain("Springfield, MO, 65801, United States");
  });
});

describe("next services", () => {
  const week = [svc(0, "10:00", "Sunday worship"), svc(0, "18:00", "Sunday evening"), svc(3, "19:00", "Wednesday prayer"), svc(6, "09:00", "Saturday men")];
  const names = (list: { label: string }[]) => list.map((s) => s.label);

  it("starts at the church's own local time, so the same moment gives different answers in different zones", () => {
    // 2026-10-11 15:00 UTC is Sunday 10:00 in Chicago (CDT) but Sunday 05:00 in Honolulu and Sunday 16:00 in London.
    const now = new Date("2026-10-11T15:00:00Z");
    expect(names(nextServices(week, now, "America/Chicago"))).toEqual(["Sunday worship", "Sunday evening", "Wednesday prayer"]); // starting now counts
    expect(names(nextServices(week, now, "Pacific/Honolulu"))).toEqual(["Sunday worship", "Sunday evening", "Wednesday prayer"]);
    expect(names(nextServices(week, now, "Europe/London"))).toEqual(["Sunday evening", "Wednesday prayer", "Saturday men"]); // 10:00 has passed there
  });

  it("a service earlier today is next week's, after the rest", () => {
    const sundayEvening = new Date("2026-10-12T01:30:00Z"); // Sunday 20:30 in Chicago
    expect(names(nextServices(week, sundayEvening, "America/Chicago", 4))).toEqual(["Wednesday prayer", "Saturday men", "Sunday worship", "Sunday evening"]);
  });

  it("handles the end of the week and a church with none", () => {
    // 2026-10-11 00:00 UTC is Saturday 19:00 in Chicago: Saturday's 9:00 has passed, so Sunday morning is next.
    expect(names(nextServices(week, new Date("2026-10-11T00:00:00Z"), "America/Chicago", 1))).toEqual(["Sunday worship"]);
    // Saturday 08:00 in Chicago: the Saturday 9:00 service is next.
    expect(names(nextServices(week, new Date("2026-10-10T13:00:00Z"), "America/Chicago", 1))).toEqual(["Saturday men"]);
    expect(nextServices([], new Date(), "America/Chicago")).toEqual([]);
    expect(nextServices(week, new Date(), "America/Chicago", 0)).toEqual([]);
  });

  it("does not change the list it is given", () => {
    const copy = JSON.stringify(week);
    nextServices(week, new Date(), "America/Chicago");
    expect(JSON.stringify(week)).toBe(copy);
  });
});
