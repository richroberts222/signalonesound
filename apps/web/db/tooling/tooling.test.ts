import { describe, expect, it } from "vitest";
import { EnvValidationError } from "@signalone/shared";

import type { Row, SqlExecutor } from "./executor";
import { parseEnvFlag, resolveToolingTarget } from "./guard";
import { resetData } from "./reset";
import { runSeeds, type Seed } from "./seed";

const URL = "postgresql://user:pw@example.invalid/db";
const env = (extra: Record<string, string> = {}) => ({ DATABASE_ENV: "dev", DATABASE_URL: URL, ...extra });

describe("resolveToolingTarget", () => {
  it("allows dev and qa when --env matches", () => {
    expect(resolveToolingTarget(env(), "db:reset", "dev").databaseEnv).toBe("dev");
    expect(resolveToolingTarget(env({ DATABASE_ENV: "qa" }), "db:seed", "qa").databaseEnv).toBe("qa");
  });
  it("refuses prod, even with matching flag and APP_ENV", () => {
    expect(() => resolveToolingTarget(env({ DATABASE_ENV: "prod", APP_ENV: "prod" }), "db:reset", "prod")).toThrow(/protected/);
  });
  it("refuses stage", () => {
    expect(() => resolveToolingTarget(env({ DATABASE_ENV: "stage" }), "db:seed", "stage")).toThrow(/not in the allowed set/);
  });
  it("fails closed on missing/invalid identity", () => {
    expect(() => resolveToolingTarget({ DATABASE_URL: URL }, "db:reset", "dev")).toThrow(EnvValidationError);
    expect(() => resolveToolingTarget(env({ DATABASE_ENV: "production" }), "db:reset", "dev")).toThrow(EnvValidationError);
    expect(() => resolveToolingTarget({ DATABASE_ENV: "dev" }, "db:reset", "dev")).toThrow(EnvValidationError);
  });
  it("requires explicit --env that matches DATABASE_ENV", () => {
    expect(() => resolveToolingTarget(env(), "db:reset", undefined)).toThrow(/--env/);
    expect(() => resolveToolingTarget(env(), "db:reset", "qa")).toThrow(/does not match/);
  });
  it("rejects APP_ENV mismatch (including prod app on dev db) and Vercel", () => {
    expect(() => resolveToolingTarget(env({ APP_ENV: "prod" }), "db:reset", "dev")).toThrow(/APP_ENV/);
    expect(() => resolveToolingTarget(env({ VERCEL_ENV: "preview" }), "db:reset", "dev")).toThrow(/Vercel/);
  });
  it("does not infer safety from DATABASE_URL (a dev-looking URL cannot allow prod)", () => {
    const url = "postgresql://u:p@ep-dev-branch.neon.tech/dev";
    expect(() => resolveToolingTarget({ DATABASE_ENV: "prod", DATABASE_URL: url }, "db:reset", "prod")).toThrow(/protected/);
  });
  it("never leaks the connection string in errors", () => {
    expect.assertions(1);
    try {
      resolveToolingTarget(env({ DATABASE_ENV: "prod" }), "db:reset", "prod");
    } catch (e) {
      expect(String(e)).not.toContain("pw@");
    }
  });
});

describe("parseEnvFlag", () => {
  it("parses --env and rejects unknown args", () => {
    expect(parseEnvFlag(["--", "--env=dev"])).toBe("dev");
    expect(parseEnvFlag([])).toBeUndefined();
    expect(() => parseEnvFlag(["--force"])).toThrow(/Unknown argument/);
  });
});

function fakeExec(tables: string[], ledger = true) {
  const queries: string[] = [];
  const transactions: string[][] = [];
  const applied = new Set<string>();
  const exec: SqlExecutor = {
    async query(s): Promise<Row[]> {
      queries.push(s);
      if (s.includes("information_schema.tables") && s.includes("= 'public'")) {
        return tables.map((t) => ({ table_schema: "public", table_name: t }));
      }
      if (s.includes("information_schema.tables")) return ledger ? [{ "?column?": 1 }] : [];
      if (s.startsWith("SELECT id")) return [...applied].map((id) => ({ id }));
      return [];
    },
    async transaction(stmts) {
      transactions.push([...stmts]);
      for (const st of stmts) {
        const m = /VALUES \('(.+)'\)/.exec(st);
        if (m) applied.add(m[1].replace(/''/g, "'"));
      }
    },
  };
  return { exec, queries, transactions };
}

describe("resetData", () => {
  it("truncates public tables and the ledger in one statement, quoting identifiers", async () => {
    const { exec, transactions } = fakeExec(["a", 'we"ird']);
    const out = await resetData(exec);
    expect(out).toHaveLength(3);
    expect(transactions).toHaveLength(1);
    expect(transactions[0][0]).toContain('"public"."a"');
    expect(transactions[0][0]).toContain('"public"."we""ird"');
    expect(transactions[0][0]).toContain('"signalone_tooling"."seed_runs"');
  });
  it("never touches the migration history schema and never drops anything", async () => {
    const { exec, queries, transactions } = fakeExec(["a"]);
    await resetData(exec);
    const all = [...queries, ...transactions.flat()].join("\n").toLowerCase();
    expect(all).not.toContain("drizzle");
    expect(all).not.toMatch(/drop |delete from/);
  });
  it("does nothing when there are no tables", async () => {
    const { exec, transactions } = fakeExec([], false);
    expect(await resetData(exec)).toEqual([]);
    expect(transactions).toHaveLength(0);
  });
});

describe("runSeeds", () => {
  const seeds: Seed[] = [
    { id: "one", description: "x", statements: ["SELECT 1"] },
    { id: "two's", description: "y", statements: [] },
  ];
  it("applies seeds once and is idempotent", async () => {
    const { exec, transactions } = fakeExec([]);
    expect(await runSeeds(exec, seeds)).toEqual(["one", "two's"]);
    expect(transactions[0][0]).toBe("SELECT 1");
    expect(transactions[1][0]).toContain("'two''s'");
    expect(await runSeeds(exec, seeds)).toEqual([]);
  });
});
