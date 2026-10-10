import { describe, expect, it } from "vitest";

import { formatMinor, parseDollarsToMinor } from "./money";

describe("money for the admin billing page", () => {
  it("S10 AC12 turns typed dollars into whole cents without floating point", () => {
    expect(parseDollarsToMinor("3")).toBe(300);
    expect(parseDollarsToMinor("3.5")).toBe(350);
    expect(parseDollarsToMinor("19.99")).toBe(1999);
    expect(parseDollarsToMinor("0.07")).toBe(7);
    expect(parseDollarsToMinor(" 30.00 ")).toBe(3000);
    expect(parseDollarsToMinor("10000")).toBe(1_000_000);
  });

  it("refuses anything that is not a plain amount", () => {
    for (const bad of ["", "abc", "-1", "1.234", "1,000", "$3", "3.", ".5", "10000.01", "100000", "1e3", "3 dollars"]) expect(parseDollarsToMinor(bad), bad).toBeNull();
  });

  it("formats whole cents for display", () => {
    expect(formatMinor(300, "usd")).toBe("$3.00");
    expect(formatMinor(3000, "usd")).toBe("$30.00");
    expect(formatMinor(5, "usd")).toBe("$0.05");
    expect(formatMinor(1999, "usd")).toBe("$19.99");
    expect(formatMinor(250, "eur")).toBe("EUR 2.50");
  });
});
