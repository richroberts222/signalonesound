import { describe, expect, it } from "vitest";

import {
  EnvValidationError,
  assertDestructiveAllowed,
  isClientExposedName,
  parseClientEnv,
  parseDatabaseEnv,
  parseServerEnv,
} from "./env";

const valid = {
  DATABASE_ENV: "dev",
  DATABASE_URL: "postgresql://u:SECRETPW@host/db",
  CLERK_SECRET_KEY: "sk_test_x",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_x",
};

describe("parseServerEnv", () => {
  it("detects dev and defaults APP_ENV to DATABASE_ENV", () => {
    const env = parseServerEnv(valid);
    expect(env.appEnv).toBe("dev");
    expect(env.databaseEnv).toBe("dev");
  });

  it("accepts all four environments", () => {
    for (const e of ["dev", "qa", "stage"]) {
      expect(parseServerEnv({ ...valid, DATABASE_ENV: e, APP_ENV: e }).appEnv).toBe(e);
    }
    expect(parseServerEnv({ ...valid, DATABASE_ENV: "prod", APP_ENV: "prod" }).appEnv).toBe("prod");
  });

  it("rejects invalid environment values without echoing them", () => {
    expect(() => parseServerEnv({ ...valid, DATABASE_ENV: "production" })).toThrow(/DATABASE_ENV is invalid/);
    expect(() => parseServerEnv({ ...valid, DATABASE_ENV: "DEV" })).toThrow(EnvValidationError);
    expect(() => parseServerEnv({ ...valid, APP_ENV: "nope" })).toThrow(/APP_ENV is invalid/);
  });

  it("reports every missing variable by name", () => {
    try {
      parseServerEnv({});
      expect.unreachable();
    } catch (e) {
      const issues = (e as EnvValidationError).issues.join("\n");
      for (const name of ["DATABASE_ENV", "DATABASE_URL", "CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"]) {
        expect(issues).toContain(name);
      }
    }
  });

  it("treats blank values as missing", () => {
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: "  " })).toThrow(/DATABASE_URL is not set/);
  });

  it("never includes secret values in error messages", () => {
    try {
      parseServerEnv({ ...valid, DATABASE_ENV: "bogus" });
    } catch (e) {
      expect((e as Error).message).not.toContain("SECRETPW");
    }
  });

  it("refuses a non-prod app pointed at the prod database, and vice versa", () => {
    expect(() => parseServerEnv({ ...valid, APP_ENV: "dev", DATABASE_ENV: "prod" })).toThrow(/both be 'prod'/);
    expect(() => parseServerEnv({ ...valid, APP_ENV: "prod", DATABASE_ENV: "dev" })).toThrow(/both be 'prod'/);
  });

  it("refuses Vercel Preview against prod", () => {
    expect(() =>
      parseServerEnv({ ...valid, DATABASE_ENV: "prod", APP_ENV: "prod", VERCEL_ENV: "preview" }),
    ).toThrow(/Preview/);
    expect(parseServerEnv({ ...valid, VERCEL_ENV: "preview" }).appEnv).toBe("dev");
  });
});

describe("parseDatabaseEnv", () => {
  it("needs only DATABASE_ENV and DATABASE_URL", () => {
    expect(parseDatabaseEnv({ DATABASE_ENV: "qa", DATABASE_URL: "x" })).toEqual({
      databaseEnv: "qa",
      databaseUrl: "x",
    });
  });
  it("fails clearly when missing", () => {
    expect(() => parseDatabaseEnv({})).toThrow(/DATABASE_ENV is not set/);
  });
});

describe("parseClientEnv", () => {
  it("returns only client-safe values", () => {
    const env = parseClientEnv({ ...valid, NEXT_PUBLIC_APP_ENV: "qa" });
    expect(Object.keys(env).sort()).toEqual(["appEnv", "clerkPublishableKey"]);
    expect(env.appEnv).toBe("qa");
    expect(JSON.stringify(env)).not.toContain("SECRETPW");
    expect(JSON.stringify(env)).not.toContain("sk_test");
  });
  it("rejects an invalid NEXT_PUBLIC_APP_ENV and a missing key", () => {
    expect(() => parseClientEnv({ ...valid, NEXT_PUBLIC_APP_ENV: "x" })).toThrow(/NEXT_PUBLIC_APP_ENV/);
    expect(() => parseClientEnv({})).toThrow(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/);
  });
});

describe("assertDestructiveAllowed", () => {
  it("refuses prod even if explicitly allowed", () => {
    expect(() => assertDestructiveAllowed("prod", ["dev", "prod"], "reset")).toThrow(/protected/);
  });
  it("refuses unknown targets (fails closed)", () => {
    expect(() => assertDestructiveAllowed(undefined, ["dev"], "reset")).toThrow(/unknown/);
  });
  it("refuses environments outside the allowed set", () => {
    expect(() => assertDestructiveAllowed("stage", ["dev", "qa"], "seed")).toThrow(/not in the allowed set/);
  });
  it("allows listed non-protected environments", () => {
    expect(() => assertDestructiveAllowed("qa", ["dev", "qa"], "seed")).not.toThrow();
  });
});

describe("isClientExposedName", () => {
  it("flags public prefixes only", () => {
    expect(isClientExposedName("NEXT_PUBLIC_X")).toBe(true);
    expect(isClientExposedName("EXPO_PUBLIC_X")).toBe(true);
    expect(isClientExposedName("DATABASE_URL")).toBe(false);
  });
});
