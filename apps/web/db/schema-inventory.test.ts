import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// Data inventory guard (docs/data-inventory.md, docs/secure-coding.md section 1). Every column the
// schema defines must be classified with a tier, a purpose, a retention and a deletion path, so the
// privacy policy, the retention schedule and account deletion are built from facts and not memory.
const schemaPath = path.join(__dirname, "schema.ts");
const inventoryPath = path.join(__dirname, "..", "..", "..", "docs", "data-inventory.md");

const COLUMN_CALL = /\b(?:integer|bigint|smallint|serial|text|varchar|char|uuid|boolean|timestamp|date|time|jsonb|json|numeric|real|doublePrecision)\(\s*"([a-z0-9_]+)"/g;

/** "table.column" for every column defined with pgTable("name", { ... }) in the schema text. */
export function schemaColumns(source: string): string[] {
  const out: string[] = [];
  const tables = [...source.matchAll(/pgTable\(\s*"([a-z0-9_]+)"/g)];
  tables.forEach((table, i) => {
    const end = i + 1 < tables.length ? (tables[i + 1].index ?? source.length) : source.length;
    const block = source.slice(table.index ?? 0, end);
    for (const col of block.matchAll(COLUMN_CALL)) out.push(`${table[1]}.${col[1]}`);
  });
  return out;
}

type Row = { key: string; tier: string; purpose: string; retention: string; deletion: string };

/** The rows of the inventory table; marker comments and prose are ignored. */
export function inventoryRows(markdown: string): Row[] {
  const rows: Row[] = [];
  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const m = /^\|\s*`?([a-z0-9_]+\.[a-z0-9_]+)`?\s*\|\s*(T[0-9])\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$/.exec(line);
    if (m) rows.push({ key: m[1], tier: m[2], purpose: m[3], retention: m[4], deletion: m[5] });
  }
  return rows;
}

describe("data inventory", () => {
  const columns = schemaColumns(readFileSync(schemaPath, "utf8"));
  const rows = inventoryRows(readFileSync(inventoryPath, "utf8"));

  it("classifies every column in the schema", () => {
    const listed = new Set(rows.map((r) => r.key));
    expect(columns.filter((c) => !listed.has(c)), "add these columns to docs/data-inventory.md").toEqual([]);
  });

  it("has no row for a column that does not exist", () => {
    const defined = new Set(columns);
    expect(rows.filter((r) => !defined.has(r.key)).map((r) => r.key), "remove or fix these rows in docs/data-inventory.md").toEqual([]);
  });

  it("stores no restricted (T4) data and gives every row a purpose, retention and deletion path", () => {
    expect(rows.filter((r) => r.tier === "T4").map((r) => r.key)).toEqual([]);
    expect(rows.filter((r) => !r.purpose || !r.retention || !r.deletion).map((r) => r.key)).toEqual([]);
  });

  it("makes every owner column declare what happens when the owner is deleted", () => {
    const owners = rows.filter((r) => r.key.endsWith(".owner_id") || r.key.endsWith(".user_id"));
    expect(owners.filter((r) => !/delete|anonymi[sz]e|retain/i.test(r.deletion)).map((r) => r.key)).toEqual([]);
  });

  it("the scan reads schema and table shapes correctly (self-test)", () => {
    const sample = 'export const a = pgTable("t1", { id: uuid("id"), ownerId: text("owner_id") });\nexport const b = pgTable("t2", { at: timestamp("created_at", { withTimezone: true }) });';
    expect(schemaColumns(sample)).toEqual(["t1.id", "t1.owner_id", "t2.created_at"]);
    const md = "<!-- marker -->\n| t1.id | T1 | p | r | d |\n| Table.column | Tier | Purpose |\n| --- | --- | --- |\n| `t2.created_at` | T2 | p | r | d |";
    expect(inventoryRows(md).map((r) => r.key)).toEqual(["t1.id", "t2.created_at"]);
  });
});
