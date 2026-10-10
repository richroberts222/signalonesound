import { describe, expect, it } from "vitest";

import { dark } from "./palette";
import { appPalette, useTheme } from "./theme";

// S5 polish: the phone matches the web's single dark theme (the owner saw a light phone next to a dark site).
describe("phone theme", () => {
  it("is the dark palette, the same look as the web", () => {
    expect(appPalette).toBe(dark);
    expect(useTheme()).toBe(dark);
    expect(dark.background).toMatch(/^#0/); // near-black, like the web's background
  });
});
