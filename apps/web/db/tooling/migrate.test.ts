import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EnvValidationError } from "@signalone/shared";

import type { Row, SqlExecutor } from "./executor";
import {
  computeStatus,
  readAppliedCreatedAt,
  readJournal,
  resolveMigrationTarget,
  verifyMigrationProofSchema,
} from "./migrate";

const URL = "postgresql://example.invalid/db";
const env = (extra: Record<string, string> = {}) => ({ DATABASE_ENV: "dev", DATABASE_URL: URL, ...extra });
const webRoot = path.resolve(__dirname, "../..");

describe("resolveMigrationTarget", () => {
  it("allows dev, qa and stage when --env matches", () => {
    for (const name of ["dev", "qa", "stage"]) {
      expect(resolveMigrationTarget(env({ DATABASE_ENV: name }), "db:migrate", name).databaseEnv).toBe(name);
    }
  });
  it("refuses prod, even with matching flag and APP_ENV", () => {
    expect(() => resolveMigrationTarget(env({ DATABASE_ENV: "prod", APP_ENV: "prod" }), "db:migrate", "prod")).toThrow(/protected/);
  });
  it("fails closed on missing or invalid identity", () => {
    expect(() => resolveMigrationTarget({ DATABASE_URL: URL }, "db:migrate", "dev")).toThrow(EnvValidationError);
    expect(() => resolveMigrationTarget({ DATABASE_ENV: "dev" }, "db:migrate", "dev")).toThrow(EnvValidationError);
    expect(() => resolveMigrationTarget(env({ DATABASE_ENV: "production" }), "db:migrate", "dev")).toThrow(EnvValidationError);
  });
  it("requires an explicit --env matching DATABASE_ENV", () => {
    expect(() => resolveMigrationTarget(env(), "db:migrate", undefined)).toThrow(/--env/);
    expect(() => resolveMigrationTarget(env(), "db:migrate", "qa")).toThrow(/does not match/);
  });
  it("rejects APP_ENV mismatch and Vercel", () => {
    expect(() => resolveMigrationTarget(env({ APP_ENV: "prod" }), "db:migrate", "dev")).toThrow(/APP_ENV/);
    expect(() => resolveMigrationTarget(env({ VERCEL_ENV: "preview" }), "db:migrate", "dev")).toThrow(/Vercel/);
  });
  it("does not infer safety from DATABASE_URL", () => {
    const hint = "postgresql://dev-branch.example.invalid/dev";
    expect(() => resolveMigrationTarget({ DATABASE_ENV: "prod", DATABASE_URL: hint }, "db:migrate", "prod")).toThrow(/protected/);
  });
});

describe("computeStatus", () => {
  const journal = [
    { idx: 0, tag: "0000_a", when: 100 },
    { idx: 1, tag: "0001_b", when: 200 },
  ];
  it("treats everything as pending on an unmigrated database", () => {
    expect(computeStatus(journal, []).pending.map((e) => e.tag)).toEqual(["0000_a", "0001_b"]);
  });
  it("reports partial and fully applied states", () => {
    expect(computeStatus(journal, [100]).pending.map((e) => e.tag)).toEqual(["0001_b"]);
    const done = computeStatus(journal, [100, 200]);
    expect(done.pending).toEqual([]);
    expect(done.applied).toHaveLength(2);
  });
  it("flags history unknown to the committed journal", () => {
    expect(computeStatus(journal, [100, 999]).unknownInDatabase).toBe(1);
  });
});

function fakeExec(handler: (s: string) => Row[]): SqlExecutor {
  return { query: async (s) => handler(s), transaction: async () => undefined };
}

describe("database readers", () => {
  it("reads no history when the drizzle schema is absent", async () => {
    expect(await readAppliedCreatedAt(fakeExec(() => []))).toEqual([]);
  });
  it("reads applied timestamps as numbers", async () => {
    const exec = fakeExec((s) => (s.includes("information_schema") ? [{ "?column?": 1 }] : [{ created_at: "100" }]));
    expect(await readAppliedCreatedAt(exec)).toEqual([100]);
  });
  it("verifies the proof schema and reports problems", async () => {
    const good = fakeExec(() => [
      { column_name: "id", data_type: "integer", is_nullable: "NO" },
      { column_name: "note", data_type: "text", is_nullable: "NO" },
    ]);
    expect(await verifyMigrationProofSchema(good)).toEqual([]);
    expect((await verifyMigrationProofSchema(fakeExec(() => []))).length).toBeGreaterThan(0);
  });
});

describe("committed migration foundation", () => {
  it("has a committed journal whose SQL files exist", () => {
    const folder = path.join(webRoot, "drizzle");
    const journal = readJournal(folder);
    expect(journal.length).toBeGreaterThan(0);
    for (const entry of journal) expect(existsSync(path.join(folder, `${entry.tag}.sql`))).toBe(true);
  });
  it("never exposes drizzle-kit push as a package script", () => {
    const pkg = JSON.parse(readFileSync(path.join(webRoot, "package.json"), "utf8")) as { scripts: Record<string, string> };
    for (const command of Object.values(pkg.scripts)) expect(command).not.toMatch(/drizzle-kit\s+push/);
    expect(pkg.scripts["db:migrate"]).not.toMatch(/drizzle-kit/);
  });
});
