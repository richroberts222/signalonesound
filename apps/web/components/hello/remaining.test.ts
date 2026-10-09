import { describe, expect, it } from "vitest";

import { remainingCharacters } from "./remaining";

// S0 controls inventory: the counter shows the characters left, and the 141st is blocked by the
// server rule, so the screen must count exactly as the server does (code points, after trimming).
describe("remainingCharacters", () => {
  it("counts down from the maximum", () => {
    expect(remainingCharacters("", 140)).toBe(140);
    expect(remainingCharacters("hello", 140)).toBe(135);
  });

  it("counts a four-byte emoji as one character, like the server", () => {
    expect(remainingCharacters(String.fromCodePoint(0x1f525).repeat(10), 140)).toBe(130);
  });

  it("ignores surrounding spaces, like the server's trim", () => {
    expect(remainingCharacters("   hi   ", 140)).toBe(138);
  });

  it("never goes below zero", () => {
    expect(remainingCharacters("x".repeat(200), 140)).toBe(0);
  });
});
