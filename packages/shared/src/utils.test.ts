import { describe, expect, it } from "vitest";

import { fail, ok } from "./result";
import { assertNever, clamp } from "./utils";

describe("clamp", () => {
  it("bounds values on both sides and passes in-range values through", () => {
    expect(clamp(5, 1, 10)).toBe(5);
    expect(clamp(-3, 1, 10)).toBe(1);
    expect(clamp(99, 1, 10)).toBe(10);
  });
});

describe("assertNever", () => {
  it("throws with the offending value", () => {
    expect(() => assertNever("x" as never)).toThrow(/Unexpected value: x/);
  });
});

describe("Result helpers", () => {
  it("ok wraps data", () => {
    expect(ok(1)).toEqual({ ok: true, data: 1 });
  });

  it("fail carries code, message and field errors", () => {
    expect(fail("validation_failed", "bad", { email: ["required"] })).toEqual({
      ok: false,
      error: { code: "validation_failed", message: "bad", fieldErrors: { email: ["required"] } },
    });
  });
});
