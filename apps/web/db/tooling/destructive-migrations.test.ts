import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Destructive-migration guard (docs/database.md section 12.3). Migrations are forward-only and a
// bad one cannot be undone once real data exists. A migration that can lose or reshape data must
// carry an explicit marker naming the issue or reason that approved it, in a line of its own:
//   -- allow-destructive: issue-123 renames column x to y after the backfill
// and must have been tried on a Neon branch of production data first (database.md).
const folder = path.join(__dirname, "..", "..", "drizzle");

const DESTRUCTIVE: [string, RegExp][] = [
  ["DROP TABLE/COLUMN/SCHEMA/INDEX/CONSTRAINT/TYPE", /\bDROP\s+(?:TABLE|COLUMN|SCHEMA|INDEX|CONSTRAINT|TYPE)\b/i],
  ["ALTER COLUMN ... TYPE", /\bALTER\s+COLUMN\b[^;]*\bTYPE\b/i],
  ["SET NOT NULL", /\bSET\s+NOT\s+NULL\b/i],
  ["RENAME", /\bRENAME\s+(?:TO|COLUMN|CONSTRAINT)\b/i],
  ["TRUNCATE", /\bTRUNCATE\b/i],
  ["DELETE FROM", /\bDELETE\s+FROM\b/i],
];
const MARKER = /^--\s*allow-destructive:\s*\S+/m;

export function destructiveStatements(sql: string): string[] {
  const withoutComments = sql.replace(/--[^\n]*/g, "");
  return DESTRUCTIVE.filter(([, re]) => re.test(withoutComments)).map(([name]) => name);
}
export const isApproved = (sql: string) => MARKER.test(sql);

describe("destructive migrations", () => {
  it("every committed migration is non-destructive or carries an approval marker", () => {
    // A new application starts with no migrations folder; that is a valid, empty state.
    const files = (existsSync(folder) ? readdirSync(folder) : []).filter((f) => f.endsWith(".sql"));
    const offenders = files.flatMap((f) => {
      const sql = readFileSync(path.join(folder, f), "utf8");
      const found = destructiveStatements(sql);
      return found.length > 0 && !isApproved(sql) ? [`${f}: ${found.join(", ")}`] : [];
    });
    expect(offenders, "add '-- allow-destructive: <issue or reason>' after review, or make the change expand-then-contract").toEqual([]);
  });

  it("the scan recognises each destructive statement and the approval marker (self-test)", () => {
    expect(destructiveStatements('ALTER TABLE "t" DROP COLUMN "x";')).toEqual(["DROP TABLE/COLUMN/SCHEMA/INDEX/CONSTRAINT/TYPE"]);
    expect(destructiveStatements('ALTER TABLE "t" ALTER COLUMN "x" SET DATA TYPE integer;')).toEqual(["ALTER COLUMN ... TYPE"]);
    expect(destructiveStatements('ALTER TABLE "t" ALTER COLUMN "x" SET NOT NULL;')).toEqual(["SET NOT NULL"]);
    expect(destructiveStatements('ALTER TABLE "t" RENAME COLUMN "a" TO "b";')).toEqual(["RENAME"]);
    expect(destructiveStatements("TRUNCATE TABLE t;")).toEqual(["TRUNCATE"]);
    expect(destructiveStatements("DELETE FROM t WHERE 1=1;")).toEqual(["DELETE FROM"]);
    expect(destructiveStatements('CREATE TABLE "t" ("id" uuid PRIMARY KEY);')).toEqual([]);
    expect(destructiveStatements("-- DROP TABLE mentioned in a comment only\nSELECT 1;")).toEqual([]);
    expect(isApproved("-- allow-destructive: issue-12 backfilled first\nDROP TABLE t;")).toBe(true);
    expect(isApproved("DROP TABLE t;")).toBe(false);
  });
});
