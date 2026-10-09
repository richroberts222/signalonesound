import { describe, expect, it } from "vitest";

import { HELLO_NOTE_MAX, helloSchema, parseInput, putHelloSchema, remainingCharacters } from "./index";

// S0 AC5: the note is trimmed, limited to 140 code points, single line, plain text,
// and unknown fields are rejected.
describe("putHelloSchema", () => {
  const ok = (note: unknown) => parseInput(putHelloSchema, { note });
  const fire = String.fromCodePoint(0x1f525);

  it("trims and accepts a normal note", () => {
    expect(ok("  hello there  ")).toEqual({ ok: true, data: { note: "hello there" } });
  });

  it("accepts an empty note (it clears the note)", () => {
    expect(ok("   ")).toEqual({ ok: true, data: { note: "" } });
  });

  it("counts code points: 140 four-byte emoji pass, 141 fail", () => {
    expect(ok(fire.repeat(HELLO_NOTE_MAX)).ok).toBe(true);
    expect(ok(fire.repeat(HELLO_NOTE_MAX + 1)).ok).toBe(false);
  });

  it("rejects newlines, tabs, NUL, DEL and other control characters", () => {
    for (const code of [10, 9, 0, 127, 133]) {
      const bad = `a${String.fromCharCode(code)}b`;
      expect(ok(bad).ok, `code ${code}`).toBe(false);
    }
  });

  it("rejects unknown fields and non-string notes", () => {
    expect(parseInput(putHelloSchema, { note: "x", role: "admin" }).ok).toBe(false);
    expect(parseInput(putHelloSchema, { note: 5 }).ok).toBe(false);
    expect(parseInput(putHelloSchema, {}).ok).toBe(false);
    expect(parseInput(putHelloSchema, null).ok).toBe(false);
  });

  it("keeps markup as plain text (it is never interpreted)", () => {
    expect(ok("<b>hi</b>")).toEqual({ ok: true, data: { note: "<b>hi</b>" } });
  });
});

describe("helloSchema", () => {
  it("allows a note or null", () => {
    expect(helloSchema.safeParse({ note: null }).success).toBe(true);
    expect(helloSchema.safeParse({ note: "x" }).success).toBe(true);
    expect(helloSchema.safeParse({}).success).toBe(false);
  });
});

// The counter on every client shows the characters left; it must count exactly like the server.
describe("remainingCharacters", () => {
  it("counts down from the maximum", () => {
    expect(remainingCharacters("")).toBe(HELLO_NOTE_MAX);
    expect(remainingCharacters("hello")).toBe(HELLO_NOTE_MAX - 5);
  });

  it("counts a four-byte emoji as one character, like the server", () => {
    expect(remainingCharacters(String.fromCodePoint(0x1f525).repeat(10))).toBe(HELLO_NOTE_MAX - 10);
  });

  it("ignores surrounding spaces, like the server's trim", () => {
    expect(remainingCharacters("   hi   ")).toBe(HELLO_NOTE_MAX - 2);
  });

  it("never goes below zero", () => {
    expect(remainingCharacters("x".repeat(HELLO_NOTE_MAX + 60))).toBe(0);
  });
});
