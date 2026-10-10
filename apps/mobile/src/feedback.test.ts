import { describe, expect, it } from "vitest";

import { DISABLED_OPACITY, PRESSED_OPACITY, feedbackOpacity } from "./feedback";

// S5 polish: a tap must visibly register (the owner found the buttons looked unchanged when tapped).
describe("press feedback", () => {
  it("a pressed control looks clearly different from a resting one", () => {
    expect(feedbackOpacity({ pressed: false })).toBe(1);
    expect(feedbackOpacity({ pressed: true })).toBe(PRESSED_OPACITY);
    expect(PRESSED_OPACITY).toBeLessThan(0.8); // a subtle change is not enough to notice
  });

  it("a disabled control looks different from both resting and pressed, and stays that way when tapped", () => {
    expect(feedbackOpacity({ pressed: false, disabled: true })).toBe(DISABLED_OPACITY);
    expect(feedbackOpacity({ pressed: true, disabled: true })).toBe(DISABLED_OPACITY);
    expect(DISABLED_OPACITY).not.toBe(PRESSED_OPACITY);
    expect(DISABLED_OPACITY).toBeLessThan(1);
  });
});
