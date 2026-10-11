import { describe, expect, it } from "vitest";

import { COORDINATES_HELP, formatPin, parseCoordinates, roundPin } from "./coordinates";

// S17 AC1 AC4: the paste box turns text into a pin, or says what is wrong.
const pin = (text: string) => {
  const r = parseCoordinates(text);
  return r.ok ? r.pin : r.message;
};

describe("pasted coordinates", () => {
  it("reads the formats phone map apps copy", () => {
    const expected = { lat: 36.1627, lng: -86.7816 };
    for (const text of ["36.1627, -86.7816", "36.1627,-86.7816", "36.1627 -86.7816", "36.1627; -86.7816", "(36.1627, -86.7816)", "  36.1627 ,  -86.7816  ", "lat: 36.1627 lng: -86.7816", "Latitude 36.1627, Longitude -86.7816"]) {
      expect(pin(text), text).toEqual(expected);
    }
  });

  it("reads compass letters and degree signs", () => {
    expect(pin("36.1627 N, 86.7816 W")).toEqual({ lat: 36.1627, lng: -86.7816 });
    expect(pin("36.1627°N 86.7816°W")).toEqual({ lat: 36.1627, lng: -86.7816 });
    expect(pin("N36.1627 W86.7816")).toEqual({ lat: 36.1627, lng: -86.7816 });
    expect(pin("1.3133 S, 36.7881 E")).toEqual({ lat: -1.3133, lng: 36.7881 }); // a village in Nairobi
    expect(pin("33.8688 S 151.2093 E")).toEqual({ lat: -33.8688, lng: 151.2093 });
  });

  it("reads whole numbers and the edges of the map", () => {
    expect(pin("0, 0")).toEqual({ lat: 0, lng: 0 });
    expect(pin("90, 180")).toEqual({ lat: 90, lng: 180 });
    expect(pin("-90, -180")).toEqual({ lat: -90, lng: -180 });
  });

  it("rounds to about a metre", () => {
    expect(pin("36.123456789, -86.987654321")).toEqual({ lat: 36.12346, lng: -86.98765 });
    expect(roundPin({ lat: 1.000004, lng: 2.000006 })).toEqual({ lat: 1, lng: 2.00001 });
  });

  it("says what is wrong when the numbers are out of range", () => {
    expect(pin("91, 0")).toBe("Latitude must be between -90 and 90");
    expect(pin("0, 181")).toBe("Longitude must be between -180 and 180");
    // San Francisco typed longitude first: caught because the first number cannot be a latitude. (A swapped pair that
    // happens to be in range, such as -86.78, 36.16, is a different valid place and cannot be told apart; the map shows it.)
    expect(pin("-122.42, 37.77")).toBe("Latitude must be between -90 and 90");
  });

  it("gives the same help for anything that is not a pair of numbers", () => {
    for (const text of ["", "   ", "Nashville", "36.1627", "36.1627, ", "abc, def", "36.1627, -86.7816, 5", "36,1627 -86,7816x", "NaN, NaN"]) {
      expect(pin(text), JSON.stringify(text)).toBe(COORDINATES_HELP);
    }
  });

  it("writes a pin back with five decimals", () => {
    expect(formatPin({ lat: 36.1627, lng: -86.7816 })).toBe("36.16270, -86.78160");
    expect(formatPin({ lat: -1.3133, lng: 36.7881 })).toBe("-1.31330, 36.78810");
  });
});
