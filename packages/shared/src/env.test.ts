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

describe("parseServerEnv RATE_LIMIT_SALT", () => {
  const base = {
    DATABASE_ENV: "dev",
    DATABASE_URL: ["postgres", "://placeholder-user:placeholder-pass@placeholder.example/db"].join(""),
    CLERK_SECRET_KEY: "sk_test_REPLACE_ME",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_REPLACE_ME",
  };

  it("is null when unset and read when long enough; a short one is refused", () => {
    expect(parseServerEnv(base).rateLimitSalt).toBeNull();
    expect(parseServerEnv({ ...base, RATE_LIMIT_SALT: "a-long-enough-salt-value" }).rateLimitSalt).toBe("a-long-enough-salt-value");
    expect(() => parseServerEnv({ ...base, RATE_LIMIT_SALT: "short" })).toThrow(/RATE_LIMIT_SALT/);
  });
});

describe("parseServerEnv UNSUBSCRIBE_SECRET and PUSH_PROVIDER", () => {
  const base = {
    DATABASE_ENV: "dev",
    DATABASE_URL: ["postgres", "://placeholder-user:placeholder-pass@placeholder.example/db"].join(""),
    CLERK_SECRET_KEY: "sk_test_REPLACE_ME",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_REPLACE_ME",
  };

  it("default to no secret and no push provider", () => {
    const env = parseServerEnv(base);
    expect(env.unsubscribeSecret).toBeNull();
    expect(env.pushProvider).toBe("none");
  });

  it("read a long secret and the expo provider; refuse a short secret or an unknown provider", () => {
    const long = "a-long-enough-secret-value-of-32-chars";
    expect(parseServerEnv({ ...base, UNSUBSCRIBE_SECRET: long, PUSH_PROVIDER: "expo" })).toMatchObject({ unsubscribeSecret: long, pushProvider: "expo" });
    expect(() => parseServerEnv({ ...base, UNSUBSCRIBE_SECRET: "too-short" })).toThrow(/UNSUBSCRIBE_SECRET/);
    expect(() => parseServerEnv({ ...base, PUSH_PROVIDER: "onesignal" })).toThrow(/PUSH_PROVIDER/);
  });
});

describe("parseServerEnv email settings (S14)", () => {
  const base = {
    DATABASE_ENV: "dev",
    DATABASE_URL: ["postgres", "://placeholder-user:placeholder-pass@placeholder.example/db"].join(""),
    CLERK_SECRET_KEY: "sk_test_REPLACE_ME",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_REPLACE_ME",
  };

  it("S14 AC1 defaults to no provider and an empty allowlist", () => {
    expect(parseServerEnv(base)).toMatchObject({ emailProvider: "none", emailFrom: null, sesRegion: null, emailAllowlist: [] });
  });

  it("S14 AC2 SES needs a sender and a region, and says which one is missing", () => {
    expect(() => parseServerEnv({ ...base, EMAIL_PROVIDER: "ses" })).toThrow(/EMAIL_FROM is required[\s\S]*SES_REGION is required/);
    expect(() => parseServerEnv({ ...base, EMAIL_PROVIDER: "ses", EMAIL_FROM: "Signal One Sound <no-reply@signalonesound.com>" })).toThrow(/SES_REGION is required/);
    const salted = { ...base, RATE_LIMIT_SALT: "a-stable-salt-of-enough-length" };
    const ok = parseServerEnv({ ...salted, EMAIL_PROVIDER: "ses", EMAIL_FROM: "Signal One Sound <no-reply@signalonesound.com>", SES_REGION: "us-east-1" });
    expect(ok).toMatchObject({ emailProvider: "ses", emailFrom: "Signal One Sound <no-reply@signalonesound.com>", sesRegion: "us-east-1" });
    expect(parseServerEnv({ ...salted, EMAIL_PROVIDER: "ses", EMAIL_FROM: "no-reply@signalonesound.com", SES_REGION: "eu-west-2" }).emailFrom).toBe("no-reply@signalonesound.com");
    // the list of addresses that bounced is keyed with RATE_LIMIT_SALT, so SES refuses to start without a stable one
    expect(() => parseServerEnv({ ...base, EMAIL_PROVIDER: "ses", EMAIL_FROM: "no-reply@signalonesound.com", SES_REGION: "eu-west-2" })).toThrow(/RATE_LIMIT_SALT is required/);
  });

  it("S14 AC2 an unknown provider, a malformed sender, region or allowlist is refused without echoing the value", () => {
    const bad = "oops-not-allowed-value";
    expect(() => parseServerEnv({ ...base, EMAIL_PROVIDER: "sendgrid" })).toThrow(/EMAIL_PROVIDER/);
    for (const from of ["not an address", "a@b", "Name <a@b.c>\r\nBcc: x@y.z", `${bad}@`]) {
      expect(() => parseServerEnv({ ...base, EMAIL_FROM: from }), from).toThrow(/EMAIL_FROM must be/);
    }
    expect(() => parseServerEnv({ ...base, SES_REGION: "Mars" })).toThrow(/SES_REGION must be/);
    expect(() => parseServerEnv({ ...base, EMAIL_ALLOWLIST: "ok@example.com, not valid" })).toThrow(/EMAIL_ALLOWLIST/);
    try {
      parseServerEnv({ ...base, EMAIL_ALLOWLIST: bad });
    } catch (error) {
      expect(String(error)).not.toContain(bad);
    }
  });

  it("S14 AC5 reads the allowlist: addresses and domains, trimmed and lower-cased", () => {
    expect(parseServerEnv({ ...base, EMAIL_ALLOWLIST: " Tester@Example.com , simulator.amazonses.com ,, " }).emailAllowlist).toEqual(["tester@example.com", "simulator.amazonses.com"]);
  });
});

describe("parseServerEnv CONTACT_FORM_ENABLED (S15)", () => {
  const base = {
    DATABASE_ENV: "dev",
    DATABASE_URL: ["postgres", "://placeholder-user:placeholder-pass@placeholder.example/db"].join(""),
    CLERK_SECRET_KEY: "sk_test_REPLACE_ME",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_REPLACE_ME",
  };

  it("S15 AC7 is off by default and only an explicit on opens the form", () => {
    expect(parseServerEnv(base).contactFormEnabled).toBe(false);
    expect(parseServerEnv({ ...base, CONTACT_FORM_ENABLED: "off" }).contactFormEnabled).toBe(false);
    expect(parseServerEnv({ ...base, CONTACT_FORM_ENABLED: " ON " }).contactFormEnabled).toBe(true);
    expect(() => parseServerEnv({ ...base, CONTACT_FORM_ENABLED: "yes" })).toThrow(/CONTACT_FORM_ENABLED/);
  });
});

describe("parseServerEnv payment settings (S11)", () => {
  const base = {
    DATABASE_ENV: "dev",
    DATABASE_URL: ["postgres", "://placeholder-user:placeholder-pass@placeholder.example/db"].join(""),
    CLERK_SECRET_KEY: "sk_test_REPLACE_ME",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_REPLACE_ME",
  };
  // Fake values built at runtime so no key-shaped text sits in the repository.
  const testKey = ["sk", "test", "A".repeat(24)].join("_");
  const liveKey = ["sk", "live", "B".repeat(24)].join("_");
  const hook = ["whsec", "C".repeat(24)].join("_");

  it("S11 AC1 defaults to no provider and no keys", () => {
    expect(parseServerEnv(base)).toMatchObject({ paymentsProvider: "none", stripeSecretKey: null, stripeWebhookSecret: null });
  });

  it("S11 AC9 Stripe needs both values, and says which one is missing", () => {
    expect(() => parseServerEnv({ ...base, PAYMENTS_PROVIDER: "stripe" })).toThrow(/STRIPE_SECRET_KEY is required[\s\S]*STRIPE_WEBHOOK_SECRET is required/);
    expect(() => parseServerEnv({ ...base, PAYMENTS_PROVIDER: "stripe", STRIPE_SECRET_KEY: testKey })).toThrow(/STRIPE_WEBHOOK_SECRET is required/);
    expect(parseServerEnv({ ...base, PAYMENTS_PROVIDER: "stripe", STRIPE_SECRET_KEY: testKey, STRIPE_WEBHOOK_SECRET: hook })).toMatchObject({ paymentsProvider: "stripe", stripeSecretKey: testKey, stripeWebhookSecret: hook });
  });

  it("S11 AC9 refuses an unknown provider and malformed keys without echoing them", () => {
    expect(() => parseServerEnv({ ...base, PAYMENTS_PROVIDER: "paypal" })).toThrow(/PAYMENTS_PROVIDER/);
    for (const bad of ["not-a-key", "sk_test_short", "pk_test_AAAAAAAAAAAAAAAAAAAAAAAA"]) {
      try {
        parseServerEnv({ ...base, STRIPE_SECRET_KEY: bad });
        throw new Error("expected a refusal");
      } catch (error) {
        expect(String(error)).toMatch(/STRIPE_SECRET_KEY is not a Stripe secret key/);
        expect(String(error)).not.toContain(bad);
      }
    }
    expect(() => parseServerEnv({ ...base, STRIPE_WEBHOOK_SECRET: "nope" })).toThrow(/STRIPE_WEBHOOK_SECRET is not/);
  });

  it("S11 AC9 a live key is refused outside production and never echoed", () => {
    try {
      parseServerEnv({ ...base, STRIPE_SECRET_KEY: liveKey });
      throw new Error("expected a refusal");
    } catch (error) {
      expect(String(error)).toMatch(/live Stripe key is not allowed outside the prod environment/);
      expect(String(error)).not.toContain(liveKey);
    }
    expect(() => parseServerEnv({ ...base, STRIPE_SECRET_KEY: testKey })).not.toThrow(); // a test key is fine anywhere
  });
});
