import { describe, expect, it } from "vitest";

import { dark, light, type Palette } from "./palette";

// WCAG 2.2 AA (S5 AC7): normal text needs a contrast ratio of at least 4.5, and the lines that mark a
// control's edge need at least 3.
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe.each([
  ["light", light],
  ["dark", dark],
] as [string, Palette][])("%s palette", (_name, p) => {
  it("text colors reach 4.5:1 on the surfaces they sit on", () => {
    for (const [fg, bg] of [
      ["foreground", "background"],
      ["foreground", "card"],
      ["muted", "background"],
      ["muted", "card"],
      ["primary", "background"],
      ["destructive", "background"],
      ["primaryForeground", "primary"],
    ] as const) {
      expect(contrast(p[fg], p[bg]), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("control borders reach 3:1 against the background", () => {
    expect(contrast(p.border, p.background)).toBeGreaterThanOrEqual(3);
  });
});

describe("contrast", () => {
  it("is 21 for black on white and 1 for the same color", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrast("#777777", "#777777")).toBeCloseTo(1, 5);
  });
});
