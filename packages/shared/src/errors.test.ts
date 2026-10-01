import { describe, expect, it } from "vitest";

import {
  AppException,
  GENERIC_ERROR_MESSAGE,
  classifyError,
  isExpectedError,
  toAppError,
} from "./errors";
import { REDACTED, redact } from "./redact";

// Fake secrets are assembled at runtime so no secret-shaped literals are committed.
const fakeDbUrl = ["postgresql://", "user", ":", "hunter2", "@db.example.test/app"].join("");
const fakeClerkKey = ["sk", "test", "FAKEKEY123"].join("_");

describe("AppException classification", () => {
  it("treats non-internal codes as expected and internal as unexpected", () => {
    expect(isExpectedError(new AppException("not_found", "Not found."))).toBe(true);
    expect(isExpectedError(new AppException("internal", "x"))).toBe(false);
    expect(isExpectedError(new Error("boom"))).toBe(false);
    expect(isExpectedError("string")).toBe(false);
  });

  it("classifies unknown thrown values as internal", () => {
    expect(classifyError(new AppException("forbidden", "No."))).toBe("forbidden");
    expect(classifyError(new TypeError("x"))).toBe("internal");
    expect(classifyError(undefined)).toBe("internal");
  });

  it("preserves cause and context for server-side use", () => {
    const cause = new Error("db down");
    const e = new AppException("conflict", "Already exists.", { cause, context: { id: 1 } });
    expect(e.cause).toBe(cause);
    expect(e.context).toEqual({ id: 1 });
  });
});

describe("toAppError (client-safe output)", () => {
  it("returns code, public message, and field errors for expected errors only", () => {
    const e = new AppException("validation_failed", "Invalid input.", {
      fieldErrors: { email: ["Required"] },
      context: { dbUrl: fakeDbUrl },
      cause: new Error(fakeDbUrl),
    });
    const out = toAppError(e);
    expect(out).toEqual({
      code: "validation_failed",
      message: "Invalid input.",
      fieldErrors: { email: ["Required"] },
    });
    expect(JSON.stringify(out)).not.toContain("hunter2");
  });

  it("hides messages of unexpected errors", () => {
    expect(toAppError(new Error(`connect failed ${fakeDbUrl}`))).toEqual({
      code: "internal",
      message: GENERIC_ERROR_MESSAGE,
    });
    expect(toAppError(new AppException("internal", "SQL: select secret"))).toEqual({
      code: "internal",
      message: GENERIC_ERROR_MESSAGE,
    });
  });
});

describe("redact", () => {
  it("redacts sensitive keys at any depth", () => {
    const out = redact({
      user: "a",
      password: "p",
      nested: { apiKey: "k", list: [{ token: "t" }] },
    });
    expect(out).toEqual({
      user: "a",
      password: REDACTED,
      nested: { apiKey: REDACTED, list: [{ token: REDACTED }] },
    });
  });

  it("redacts secret-looking values under innocent keys", () => {
    const out = JSON.stringify(
      redact({ note: `url ${fakeDbUrl} key ${fakeClerkKey} Bearer abc.def.ghi` }),
    );
    expect(out).not.toMatch(/hunter2|FAKEKEY123|abc\.def\.ghi/);
    expect(out).toContain(REDACTED);
  });

  it("serializes errors with redacted message and cause, and survives cycles", () => {
    const err = new Error(`failed ${fakeDbUrl}`, { cause: new Error(fakeClerkKey) });
    const cyclic: Record<string, unknown> = { err };
    cyclic.self = cyclic;
    const out = JSON.stringify(redact(cyclic));
    expect(out).not.toMatch(/hunter2|FAKEKEY123/);
    expect(out).toContain("[Circular]");
  });
});
