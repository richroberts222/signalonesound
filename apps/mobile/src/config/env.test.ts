import { describe, expect, it, vi } from "vitest";

import { getMobileEnv } from "./env";

describe("getMobileEnv", () => {
  it("reads EXPO_PUBLIC_* values and validates them", () => {
    vi.stubEnv("EXPO_PUBLIC_APP_ENV", "dev");
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "http://localhost:3000");
    expect(getMobileEnv()).toEqual({
      appEnv: "dev",
      apiBaseUrl: "http://localhost:3000",
      clerkPublishableKey: undefined,
    });
  });

  it("fails clearly, by variable name, when configuration is missing", () => {
    vi.stubEnv("EXPO_PUBLIC_APP_ENV", "");
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "");
    expect(() => getMobileEnv()).toThrow(/EXPO_PUBLIC_APP_ENV[\s\S]*EXPO_PUBLIC_API_BASE_URL/);
  });

  it("ignores server secrets even when present in the process environment", () => {
    vi.stubEnv("EXPO_PUBLIC_APP_ENV", "dev");
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "http://localhost:3000");
    vi.stubEnv("DATABASE_URL", "postgresql://u:SECRETPW@host/db");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_SECRET");
    const serialized = JSON.stringify(getMobileEnv());
    expect(serialized).not.toContain("SECRETPW");
    expect(serialized).not.toContain("sk_test");
  });
});
