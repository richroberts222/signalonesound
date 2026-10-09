import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { UNSUBSCRIBE_DAYS, createUnsubscribeToken, verifyUnsubscribeToken } from "./unsubscribe";

// S7 AC5: an unsubscribe link works without signing in, only for what it was made for, and cannot be
// forged, altered or used after it expires.
const secret = "a-long-enough-signing-secret-for-tests";
const now = new Date("2026-10-09T12:00:00Z");
const action = { kind: "church" as const, userId: "user_AAAAAAAAAA", id: "11111111-1111-4111-8111-111111111111" };
const DAY = 24 * 3600 * 1000;

describe("unsubscribe tokens", () => {
  const token = createUnsubscribeToken(action, secret, now);

  it("round-trips and fits in a web address", () => {
    expect(verifyUnsubscribeToken(token, secret, now)).toEqual(action);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("expires after the lifetime, not before", () => {
    expect(verifyUnsubscribeToken(token, secret, new Date(now.getTime() + (UNSUBSCRIBE_DAYS - 1) * DAY))).toEqual(action);
    expect(verifyUnsubscribeToken(token, secret, new Date(now.getTime() + (UNSUBSCRIBE_DAYS + 1) * DAY))).toBeNull();
  });

  it("is refused if any part is changed or the secret is different", () => {
    const [payload, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ k: "church", u: "user_BBBBBBBBBB", i: action.id, e: 9999999999 })).toString("base64url");
    expect(verifyUnsubscribeToken(`${forged}.${signature}`, secret, now)).toBeNull();
    expect(verifyUnsubscribeToken(`${payload}.${signature.slice(0, -2)}xx`, secret, now)).toBeNull();
    expect(verifyUnsubscribeToken(token, "another-secret-of-sufficient-length", now)).toBeNull();
  });

  it("garbage, empty and oversized tokens are refused", () => {
    for (const bad of ["", ".", "abc", "a.b.c", `${token}.extra`, "x".repeat(500), `${Buffer.from("not json").toString("base64url")}.AAAA`]) {
      expect(verifyUnsubscribeToken(bad, secret, now), bad.slice(0, 20)).toBeNull();
    }
  });

  it("a token made with an unknown kind is refused", () => {
    const payload = Buffer.from(JSON.stringify({ k: "admin", u: "user_AAAAAAAAAA", i: "x", e: 9999999999 })).toString("base64url");
    const sig = createHmac("sha256", secret).update(payload).digest("base64url");
    expect(verifyUnsubscribeToken(`${payload}.${sig}`, secret, now)).toBeNull();
  });
});
