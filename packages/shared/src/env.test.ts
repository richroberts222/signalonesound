import { describe, expect, it } from "vitest";

import {
  EnvValidationError,
  assertDestructiveAllowed,
  assertNotProd,
  isClientExposedName,
  parseClientEnv,
  parseDatabaseEnv,
  parseMobileClientEnv,
  parseServerEnv, parseAdminUserIds,
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
  });

  it("refuses prod on any non-production Vercel deployment", () => {
    const prod = { ...valid, DATABASE_ENV: "prod", APP_ENV: "prod" };
    for (const v of ["preview", "development"]) {
      expect(() => parseServerEnv({ ...prod, VERCEL_ENV: v })).toThrow(/only allowed on a Vercel production/);
    }
    expect(parseServerEnv({ ...prod, VERCEL_ENV: "production" }).appEnv).toBe("prod");
    expect(parseServerEnv(prod).appEnv).toBe("prod");
  });

  it("maps Preview to qa and refuses stage", () => {
    const qa = { ...valid, DATABASE_ENV: "qa", APP_ENV: "qa", VERCEL_ENV: "preview" };
    expect(parseServerEnv(qa).appEnv).toBe("qa");
    expect(() => parseServerEnv({ ...qa, DATABASE_ENV: "stage", APP_ENV: "stage" })).toThrow(/must use qa/);
    expect(() => parseServerEnv({ ...valid, VERCEL_ENV: "preview" })).toThrow(/must use qa/);
    expect(() => parseServerEnv({ ...qa, APP_ENV: "dev" })).toThrow(/must use qa/);
    expect(() => parseServerEnv({ ...qa, DATABASE_ENV: "dev" })).toThrow(/must use qa/);
    // Production and unset VERCEL_ENV (local/CI) are unaffected.
    expect(parseServerEnv({ ...valid, VERCEL_ENV: "production" }).appEnv).toBe("dev");
  });

  it("refuses live Clerk keys outside prod", () => {
    const live = { ...valid, CLERK_SECRET_KEY: "sk_live_x" };
    expect(() => parseServerEnv(live)).toThrow(/live Clerk/);
    expect(parseServerEnv({ ...live, DATABASE_ENV: "prod", APP_ENV: "prod" }).appEnv).toBe("prod");
  });
});

describe("parseDatabaseEnv", () => {
  const url = "postgresql://u:SECRETPW@host/db";
  it("needs only DATABASE_ENV and DATABASE_URL", () => {
    expect(parseDatabaseEnv({ DATABASE_ENV: "qa", DATABASE_URL: url })).toEqual({
      databaseEnv: "qa",
      databaseUrl: url,
    });
  });
  it("rejects malformed and non-postgres URLs without echoing them", () => {
    expect(() => parseDatabaseEnv({ DATABASE_ENV: "dev", DATABASE_URL: "not a url" })).toThrow(/not a valid URL/);
    for (const bad of ["mysql://u:SECRETPW@h/db", "https://u:SECRETPW@h/db"]) {
      try {
        parseDatabaseEnv({ DATABASE_ENV: "dev", DATABASE_URL: bad });
        expect.unreachable();
      } catch (e) {
        expect((e as Error).message).toMatch(/postgres/);
        expect((e as Error).message).not.toContain("SECRETPW");
      }
    }
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: "mysql://h/db" })).toThrow(/postgres/);
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

describe("parseMobileClientEnv", () => {
  const mobile = {
    EXPO_PUBLIC_APP_ENV: "dev",
    EXPO_PUBLIC_API_BASE_URL: "http://localhost:3000/",
  };

  it("accepts a minimal dev config and strips trailing slashes", () => {
    expect(parseMobileClientEnv(mobile)).toEqual({
      appEnv: "dev",
      apiBaseUrl: "http://localhost:3000",
      clerkPublishableKey: undefined,
    });
  });
  it("requires explicit environment and API base URL", () => {
    expect(() => parseMobileClientEnv({})).toThrow(/EXPO_PUBLIC_APP_ENV[\s\S]*EXPO_PUBLIC_API_BASE_URL/);
  });
  it("rejects invalid environments and malformed URLs", () => {
    expect(() => parseMobileClientEnv({ ...mobile, EXPO_PUBLIC_APP_ENV: "production" })).toThrow(EnvValidationError);
    expect(() => parseMobileClientEnv({ ...mobile, EXPO_PUBLIC_API_BASE_URL: "ftp://x" })).toThrow(/http\(s\)/);
    expect(() => parseMobileClientEnv({ ...mobile, EXPO_PUBLIC_API_BASE_URL: "https://x?a=1" })).toThrow(/http\(s\)/);
  });
  it("requires https outside dev", () => {
    const qa = { EXPO_PUBLIC_APP_ENV: "qa", EXPO_PUBLIC_API_BASE_URL: "http://qa.example.test" };
    expect(() => parseMobileClientEnv(qa)).toThrow(/https/);
    expect(parseMobileClientEnv({ ...qa, EXPO_PUBLIC_API_BASE_URL: "https://qa.example.test" }).apiBaseUrl).toBe(
      "https://qa.example.test",
    );
  });
  it("validates the optional Clerk publishable key without echoing it", () => {
    expect(
      parseMobileClientEnv({ ...mobile, EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_x" }).clerkPublishableKey,
    ).toBe("pk_test_x");
    let message = "";
    try {
      parseMobileClientEnv({ ...mobile, EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "sk_test_SECRETVALUE" });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/publishable/);
    expect(message).not.toContain("SECRETVALUE");
    expect(() => parseMobileClientEnv({ ...mobile, EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_x" })).toThrow(/live/);
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

describe("assertNotProd", () => {
  it("refuses prod and unknown, allows the rest", () => {
    expect(() => assertNotProd("prod", "x")).toThrow(/refusing/);
    expect(() => assertNotProd(undefined, "x")).toThrow(/unknown/);
    for (const e of ["dev", "qa", "stage"] as const) expect(() => assertNotProd(e, "x")).not.toThrow();
  });
});

describe("isClientExposedName", () => {
  it("flags public prefixes only", () => {
    expect(isClientExposedName("NEXT_PUBLIC_X")).toBe(true);
    expect(isClientExposedName("EXPO_PUBLIC_X")).toBe(true);
    expect(isClientExposedName("DATABASE_URL")).toBe(false);
  });
});

describe("parseAdminUserIds", () => {
  it("is empty when unset (nobody is an admin by default)", () => {
    expect(parseAdminUserIds({}, [])).toEqual([]);
    expect(parseAdminUserIds({ ADMIN_USER_IDS: "  " }, [])).toEqual([]);
  });

  it("reads a comma-separated list of Clerk user ids, trimmed and de-duplicated", () => {
    expect(parseAdminUserIds({ ADMIN_USER_IDS: "user_AAAAAAAA1, user_BBBBBBBB2 ,user_AAAAAAAA1" }, [])).toEqual([
      "user_AAAAAAAA1",
      "user_BBBBBBBB2",
    ]);
  });

  it("reports a malformed entry and grants nobody (fails closed)", () => {
    for (const bad of ["admin", "user_x", "user_AAAAAAAA1,*", "user_AAAAAAAA1;user_BBBBBBBB2"]) {
      const issues: string[] = [];
      expect(parseAdminUserIds({ ADMIN_USER_IDS: bad }, issues), bad).toEqual([]);
      expect(issues, bad).toHaveLength(1);
    }
  });
});

describe("parseServerEnv CRON_SECRET", () => {
  const base = {
    DATABASE_ENV: "dev",
    DATABASE_URL: ["postgres", "://placeholder-user:placeholder-pass@placeholder.example/db"].join(""),
    CLERK_SECRET_KEY: "sk_test_REPLACE_ME",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_REPLACE_ME",
  };

  it("is null when unset (jobs refuse every call)", () => {
    expect(parseServerEnv(base).cronSecret).toBeNull();
    expect(parseServerEnv({ ...base, CRON_SECRET: "  " }).cronSecret).toBeNull();
  });

  it("is read when long enough and refused when too short", () => {
    expect(parseServerEnv({ ...base, CRON_SECRET: "a-long-enough-secret-value" }).cronSecret).toBe("a-long-enough-secret-value");
    expect(() => parseServerEnv({ ...base, CRON_SECRET: "short" })).toThrow(/CRON_SECRET/);
  });
});
