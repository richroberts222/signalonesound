import { describe, expect, it } from "vitest";

import { addressLine, churchCountText, churchDistance, nextServicesLine, placeLine } from "./format";
import { buildChurchRequest } from "./query";

describe("Find a Church on the phone: the request", () => {
  it("sends only a rounded position, and a radius only with a position", () => {
    const withPlace = buildChurchRequest({ origin: { lat: 43.61512345, lng: -116.20234567 }, radius: 25, text: "" });
    expect(withPlace).toEqual({ lat: 43.62, lng: -116.2, radius: 25 });
    expect(buildChurchRequest({ origin: null, radius: 25, text: "" })).toEqual({});
  });

  it("sends typed words as the name-or-city search, trimmed, and nothing when blank", () => {
    expect(buildChurchRequest({ origin: null, radius: 25, text: "  Grace  " })).toEqual({ q: "Grace" });
    expect(buildChurchRequest({ origin: null, radius: 25, text: "   " })).toEqual({});
  });
});

describe("Find a Church on the phone: the words", () => {
  it("names the place, falling back to the country when there is no region", () => {
    expect(placeLine({ city: "Boise", state: "ID", country: "US" })).toBe("Boise, ID");
    expect(placeLine({ city: "Lagos", state: "", country: "Nigeria" })).toBe("Lagos, Nigeria");
  });

  it("lists the next services, or says none were added", () => {
    expect(nextServicesLine({ serviceCount: 2, nextServices: [{ weekday: 0, startTime: "10:00", label: "Worship" }, { weekday: 3, startTime: "19:00", label: "Prayer" }] })).toBe(
      "Next: Sunday, 10:00 AM · Wednesday, 7:00 PM",
    );
    expect(nextServicesLine({ serviceCount: 0, nextServices: [] })).toBe("Service times not added yet");
  });

  it("words distance and the count", () => {
    expect(churchDistance(null)).toBeNull();
    expect(churchDistance(0.04)).toBe("Under 0.1 miles");
    expect(churchDistance(2.44)).toBe("2.4 miles");
    expect(churchCountText(1)).toBe("1 church found");
    expect(churchCountText(3)).toBe("3 churches found");
  });

  it("builds one address line and leaves out empty parts", () => {
    expect(addressLine({ street: "1 Main St", city: "Boise", state: "ID", zip: "83702", country: "US" })).toBe("1 Main St, Boise, ID 83702, US");
    expect(addressLine({ street: "", city: "Boise", state: "ID", zip: "", country: "US" })).toBe("Boise, ID, US");
  });
});
