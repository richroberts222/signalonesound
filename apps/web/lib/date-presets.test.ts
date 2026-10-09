import { describe, expect, it } from "vitest";

import { presetRange } from "./date-presets";

// S4 AC4: the quick date choices turn into plain calendar dates on the device. 2026-10-09 is a Friday.
const at = (iso: string) => new Date(`${iso}T09:00:00`); // local time, so the device's own calendar applies

describe("presetRange", () => {
  it("any date and chosen dates have no preset range", () => {
    expect(presetRange("any", at("2026-10-09"))).toBeNull();
    expect(presetRange("custom", at("2026-10-09"))).toBeNull();
  });

  it("today is one day", () => {
    expect(presetRange("today", at("2026-10-09"))).toEqual({ from: "2026-10-09", to: "2026-10-09" });
  });

  it("the weekend: on a weekday it is the coming Friday to Sunday; from Friday it is this weekend", () => {
    expect(presetRange("weekend", at("2026-10-05"))).toEqual({ from: "2026-10-09", to: "2026-10-11" }); // Monday
    expect(presetRange("weekend", at("2026-10-08"))).toEqual({ from: "2026-10-09", to: "2026-10-11" }); // Thursday
    expect(presetRange("weekend", at("2026-10-09"))).toEqual({ from: "2026-10-09", to: "2026-10-11" }); // Friday
  });

  it("on Saturday and Sunday the weekend has started, so it runs from today to Sunday", () => {
    expect(presetRange("weekend", at("2026-10-10"))).toEqual({ from: "2026-10-10", to: "2026-10-11" });
    expect(presetRange("weekend", at("2026-10-11"))).toEqual({ from: "2026-10-11", to: "2026-10-11" });
  });

  it("the next 7 and 30 days include today and cross month and year ends", () => {
    expect(presetRange("week", at("2026-10-29"))).toEqual({ from: "2026-10-29", to: "2026-11-04" });
    expect(presetRange("month", at("2026-12-15"))).toEqual({ from: "2026-12-15", to: "2027-01-13" });
  });
});
