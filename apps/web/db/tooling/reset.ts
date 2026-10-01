import type { SqlExecutor } from "./executor";
import { LEDGER_SCHEMA, LEDGER_TABLE } from "./seed";

/** Only `public` is reset; migration history lives in the `drizzle` schema. */
const RESET_SCHEMA = "public";

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/**
 * Removes all data rows, keeping schema, migration history (`drizzle` schema)
 * and the database itself. Truncates every base table in `public` plus the
 * tooling seed ledger, in one transaction. Returns the tables truncated.
 * Callers MUST have passed `resolveToolingTarget` first.
 */
export async function resetData(exec: SqlExecutor): Promise<string[]> {
  const rows = await exec.query(
    `SELECT table_schema, table_name FROM information_schema.tables
     WHERE table_type = 'BASE TABLE' AND table_schema = '${RESET_SCHEMA}'
     ORDER BY table_name`,
  );
  const tables = rows.map((r) => `${quoteIdent(String(r.table_schema))}.${quoteIdent(String(r.table_name))}`);
  const ledger = await exec.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = '${LEDGER_SCHEMA}' AND table_name = '${LEDGER_TABLE}'`,
  );
  if (ledger.length > 0) tables.push(`${quoteIdent(LEDGER_SCHEMA)}.${quoteIdent(LEDGER_TABLE)}`);
  if (tables.length > 0) {
    await exec.transaction([`TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`]);
  }
  return tables;
}
