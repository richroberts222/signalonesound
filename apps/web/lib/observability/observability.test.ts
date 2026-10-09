import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

import { reportUnexpectedError } from "../api/report";
import { redactText } from "./redact";

// S1 AC8 and AC9: analytics carry no identifier, and personal data never reaches a log or an
// error tracker. Seeded values are used so a leak would be visible.
describe("redactText", () => {
  const seeded = {
    email: "jane.doe@example.com",
    phone: "(615) 555-0142",
    bearer: "Bearer abcdef1234567890abcdef",
    key: ["sk", "test", "ABCDEFGH12345678"].join("_"),
    jwt: ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxMjM0NTY3ODkwIn0", "abcdEFGHijkl"].join("."),
    url: ["postgres", "://user:hunter2@db.example.com/app"].join(""),
  };

  it("removes emails, phone numbers, bearer tokens, keys, JWTs and credentialed URLs", () => {
    const text = `failed for ${seeded.email} call ${seeded.phone} header ${seeded.bearer} key ${seeded.key} jwt ${seeded.jwt} db ${seeded.url}`;
    const out = redactText(text);
    for (const value of ["jane.doe", "555-0142", "abcdef1234567890", "ABCDEFGH12345678", "eyJhbGci", "hunter2", "db.example.com"]) {
      expect(out, value).not.toContain(value);
    }
    expect(out).toContain("[redacted-email]");
    expect(out).toContain("[redacted-phone]");
  });

  it("leaves ordinary text alone", () => {
    expect(redactText("Item limit reached for event 42 on 2026-10-09")).toBe("Item limit reached for event 42 on 2026-10-09");
  });
});

describe("error reporting", () => {
  it("never lets personal data reach the log line or the error tracker", () => {
    const write = vi.fn();
    const capture = vi.fn();
    reportUnexpectedError(new Error("could not email jane.doe@example.com or call +1 615 555 0142 with Bearer abcdef1234567890abcdef"), write, {
      capture,
    });
    expect(write.mock.calls[0][0]).not.toMatch(/jane|555|abcdef/);
    const report = capture.mock.calls[0][0] as { name: string; message: string };
    expect(report.name).toBe("Error");
    expect(report.message).not.toMatch(/jane|555 0142|abcdef1234567890/);
  });
});

describe("analytics port", () => {
  const source = readFileSync(path.join(__dirname, "ports.ts"), "utf8");
  // Code only: the comments explain the rule and necessarily name the things that are not allowed.
  const analytics = source
    .slice(source.indexOf("export type AnalyticsEvent"), source.indexOf("export type ErrorReport"))
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");

  it("an event is only a name: no user, address, cookie or other identifier can be added", () => {
    expect(analytics).toMatch(/count\(event: AnalyticsEvent\): void/);
    expect(analytics).not.toMatch(/user|ip\b|address|cookie|email|session|clerk|device|fingerprint/i);
  });

  it("the check notices an identifier (self-test)", () => {
    const bad = "export type AnalyticsPort = { count(event: AnalyticsEvent, userId: string): void };";
    expect(/user|ip\b|address|cookie|email|session|clerk|device|fingerprint/i.test(bad)).toBe(true);
  });
});
