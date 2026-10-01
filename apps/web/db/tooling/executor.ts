import { neon } from "@neondatabase/serverless";

/**
 * Minimal SQL surface the tooling needs. Keeping it this small lets the
 * reset/seed logic be unit tested with a fake and keeps raw SQL confined to
 * `db/tooling` (never application code, see /docs/database.md section 5).
 */
export type Row = Record<string, unknown>;
export type SqlExecutor = {
  query(statement: string): Promise<Row[]>;
  /** Runs all statements atomically in one transaction. */
  transaction(statements: readonly string[]): Promise<void>;
};

export function createNeonExecutor(databaseUrl: string): SqlExecutor {
  const sql = neon(databaseUrl);
  return {
    async query(statement) {
      return (await sql.query(statement)) as Row[];
    },
    async transaction(statements) {
      if (statements.length === 0) return;
      await sql.transaction(statements.map((s) => sql.query(s)));
    },
  };
}
