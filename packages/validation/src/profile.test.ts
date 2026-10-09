import { describe, expect, it } from "vitest";

import {
  CURRENT_POLICY_VERSION,
  acceptPolicySchema,
  isTimeZone,
  parseInput,
  patchProfileSchema,
  profileSchema,
} from "./index";

describe("patchProfileSchema", () => {
  it("accepts allowed fields and trims the name", () => {
    expect(parseInput(patchProfileSchema, { displayName: "  Ada  ", emailPref: true, timeZone: "America/Chicago" })).toEqual({
      ok: true,
      data: { displayName: "Ada", emailPref: true, timeZone: "America/Chicago" },
    });
    expect(parseInput(patchProfileSchema, {}).ok).toBe(true);
  });

  it("rejects unknown fields (no role or id can be set)", () => {
    for (const body of [{ role: "admin" }, { id: "1" }, { displayName: "a", extra: 1 }]) {
      expect(parseInput(patchProfileSchema, body).ok, JSON.stringify(body)).toBe(false);
    }
  });

  it("rejects empty, over-long and multi-line names", () => {
    for (const displayName of ["", "  ", "x".repeat(61), "a\nb"]) {
      expect(parseInput(patchProfileSchema, { displayName }).ok, JSON.stringify(displayName)).toBe(false);
    }
  });
});

describe("acceptPolicySchema", () => {
  it("needs the 18+ attestation to be exactly true", () => {
    expect(parseInput(acceptPolicySchema, { version: CURRENT_POLICY_VERSION, ageAttested: true }).ok).toBe(true);
    for (const body of [{ version: "v" }, { version: "v", ageAttested: false }, { version: "v", ageAttested: "true" }, { ageAttested: true }]) {
      expect(parseInput(acceptPolicySchema, body).ok, JSON.stringify(body)).toBe(false);
    }
  });
});

describe("isTimeZone", () => {
  it("accepts real zones and rejects made-up or oversized values", () => {
    expect(isTimeZone("America/Chicago")).toBe(true);
    expect(isTimeZone("UTC")).toBe(true);
    for (const bad of ["", "Mars/Olympus", "x".repeat(65), "America/<script>"]) expect(isTimeZone(bad), bad).toBe(false);
  });
});

describe("profileSchema", () => {
  it("describes what clients see, including the policy status", () => {
    const ok = {
      displayName: null,
      emailPref: false,
      timeZone: null,
      policy: { currentVersion: CURRENT_POLICY_VERSION, acceptedVersion: null, accepted: false },
    };
    expect(profileSchema.safeParse(ok).success).toBe(true);
    expect(profileSchema.safeParse({ ...ok, policy: undefined }).success).toBe(false);
  });
});
