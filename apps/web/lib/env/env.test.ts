import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  assertDestructiveAllowed,
  assertNotProd,
  resolveAppEnv,
} from "./app-env";
import { parseClientEnv } from "./client";
import { parseDatabaseEnv, parseServerEnv } from "./server-schema";

const DB = "postgresql://user:pw@example.invalid/db";
const valid = {
  APP_ENV: "dev",
  DATABASE_URL: DB,
  CLERK_SECRET_KEY: "sk_test_placeholder",
};

describe("resolveAppEnv", () => {
  it("detects dev", () => expect(resolveAppEnv({ APP_ENV: "dev" })).toBe("dev"));
  it("accepts all four environments", () => {
    for (const e of ["dev", "qa", "stage", "prod"]) {
      expect(resolveAppEnv({ APP_ENV: e })).toBe(e);
    }
  });
  it("falls back to legacy DATABASE_ENV", () =>
    expect(resolveAppEnv({ DATABASE_ENV: "qa" })).toBe("qa"));
  it("rejects invalid values", () => {
    for (const bad of ["development", "production", "DEV", " dev", "test"]) {
      expect(() => resolveAppEnv({ APP_ENV: bad })).toThrow(/APP_ENV must be one of/);
    }
  });
  it("rejects a missing value", () =>
    expect(() => resolveAppEnv({})).toThrow(/received nothing/));
  it("rejects disagreeing APP_ENV and DATABASE_ENV", () =>
    expect(() => resolveAppEnv({ APP_ENV: "dev", DATABASE_ENV: "prod" })).toThrow(
      /disagree/,
    ));
  it("refuses prod on non-production Vercel deployments", () => {
    expect(() => resolveAppEnv({ APP_ENV: "prod", VERCEL_ENV: "preview" })).toThrow(
      /not allowed on a Vercel preview/,
    );
    expect(resolveAppEnv({ APP_ENV: "prod", VERCEL_ENV: "production" })).toBe("prod");
  });
});

describe("production guards", () => {
  it("assertNotProd refuses prod only", () => {
    expect(() => assertNotProd("prod", "x")).toThrow(/Refusing/);
    for (const e of ["dev", "qa", "stage"] as const) {
      expect(() => assertNotProd(e, "x")).not.toThrow();
    }
  });
  it("assertDestructiveAllowed allows only dev and qa", () => {
    expect(() => assertDestructiveAllowed("dev", "reset")).not.toThrow();
    expect(() => assertDestructiveAllowed("qa", "reset")).not.toThrow();
    expect(() => assertDestructiveAllowed("stage", "reset")).toThrow(/Refusing/);
    expect(() => assertDestructiveAllowed("prod", "reset")).toThrow(/Refusing/);
    expect(() => assertDestructiveAllowed("bogus" as never, "reset")).toThrow();
  });
});

describe("parseServerEnv / parseDatabaseEnv", () => {
  it("parses valid config", () => {
    expect(parseServerEnv(valid)).toEqual({
      appEnv: "dev",
      databaseUrl: DB,
      clerkSecretKey: "sk_test_placeholder",
    });
  });
  it("fails clearly on missing DATABASE_URL", () =>
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: undefined })).toThrow(
      "DATABASE_URL is not set.",
    ));
  it("fails clearly on missing CLERK_SECRET_KEY", () =>
    expect(() => parseServerEnv({ ...valid, CLERK_SECRET_KEY: "" })).toThrow(
      "CLERK_SECRET_KEY is not set.",
    ));
  it("rejects malformed and non-postgres URLs without echoing them", () => {
    expect(() => parseDatabaseEnv({ ...valid, DATABASE_URL: "not a url" })).toThrow(
      "DATABASE_URL is not a valid URL.",
    );
    expect(() =>
      parseDatabaseEnv({ ...valid, DATABASE_URL: "mysql://u:secretpw@h/db" }),
    ).toThrow(/postgres/);
    try {
      parseDatabaseEnv({ ...valid, DATABASE_URL: "mysql://u:secretpw@h/db" });
    } catch (e) {
      expect(String(e)).not.toContain("secretpw");
    }
  });
  it("database parsing does not require Clerk", () =>
    expect(parseDatabaseEnv({ APP_ENV: "dev", DATABASE_URL: DB }).appEnv).toBe("dev"));
  it("rejects live Clerk keys outside prod", () => {
    const live = { ...valid, CLERK_SECRET_KEY: "sk_live_placeholder" };
    expect(() => parseServerEnv(live)).toThrow(/live Clerk/);
    expect(parseServerEnv({ ...live, APP_ENV: "prod" }).appEnv).toBe("prod");
  });
});

describe("parseClientEnv", () => {
  it("requires the publishable key", () =>
    expect(() => parseClientEnv({})).toThrow(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/));
  it("returns only client-safe values", () =>
    expect(
      parseClientEnv({ NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_x" }),
    ).toEqual({ clerkPublishableKey: "pk_test_x" }));
});

// Static guard: client-reachable code must not touch server-only modules or
// secret variables.
describe("client/server boundary", () => {
  const root = join(__dirname, "../..");
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? files(p) : /\.(tsx?|mjs)$/.test(n) ? [p] : [];
    });

  it("server env module is guarded by server-only", () => {
    expect(readFileSync(join(root, "lib/env/server.ts"), "utf8")).toMatch(
      /^import "server-only";/m,
    );
    expect(readFileSync(join(root, "db/index.ts"), "utf8")).toMatch(
      /^import "server-only";/m,
    );
  });
  it("client env module reads no secrets", () => {
    const src = readFileSync(join(root, "lib/env/client.ts"), "utf8");
    expect(src).not.toMatch(/DATABASE_URL|CLERK_SECRET_KEY|server-schema|\/server/);
  });
  it("'use client' files never import server env or db", () => {
    const offenders = ["components", "app", "lib"]
      .flatMap((d) => files(join(root, d)))
      .filter((f) => !f.endsWith(".test.ts"))
      .filter((f) => /^["']use client["']/m.test(readFileSync(f, "utf8")))
      .filter((f) =>
        /lib\/env\/server|server-schema|@\/db|process\.env\.(DATABASE|CLERK_SECRET)/.test(
          readFileSync(f, "utf8"),
        ),
      );
    expect(offenders).toEqual([]);
  });
  it("no raw secret reads outside lib/env and tooling", () => {
    const offenders = ["app", "components", "db", "lib"]
      .flatMap((d) => files(join(root, d)))
      .filter((f) => !f.includes("/lib/env/"))
      .filter((f) => /process\.env\.(DATABASE_|APP_ENV|CLERK_SECRET)/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });
});
