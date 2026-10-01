import type { SqlExecutor } from "./executor";

export const LEDGER_SCHEMA = "signalone_tooling";
export const LEDGER_TABLE = "seed_runs";

/**
 * A seed is a named, idempotent unit of test data. `statements` must be
 * deterministic and may only target tables that already exist (via
 * migrations). Domain seeds are added with their schema, not here.
 */
export type Seed = {
  id: string;
  description: string;
  statements: readonly string[];
};

/** Generic seed that proves the tooling without any application schema. */
export const TOOLING_SMOKE_SEED: Seed = {
  id: "tooling-smoke",
  description: "Generic marker proving seed tooling ran (no application data).",
  statements: [],
};

export const SEEDS: readonly Seed[] = [TOOLING_SMOKE_SEED];

/**
 * Applies seeds not yet recorded in the tooling ledger. Re-running is a no-op,
 * so seeding is repeatable; `resetData` clears the ledger. Returns applied ids.
 * Callers MUST have passed `resolveToolingTarget` first.
 */
export async function runSeeds(exec: SqlExecutor, seeds: readonly Seed[] = SEEDS): Promise<string[]> {
  await exec.query(`CREATE SCHEMA IF NOT EXISTS ${LEDGER_SCHEMA}`);
  await exec.query(
    `CREATE TABLE IF NOT EXISTS ${LEDGER_SCHEMA}.${LEDGER_TABLE} (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`,
  );
  const done = new Set(
    (await exec.query(`SELECT id FROM ${LEDGER_SCHEMA}.${LEDGER_TABLE}`)).map((r) => String(r.id)),
  );
  const applied: string[] = [];
  for (const seed of seeds) {
    if (done.has(seed.id)) continue;
    const id = seed.id.replace(/'/g, "''");
    await exec.transaction([
      ...seed.statements,
      `INSERT INTO ${LEDGER_SCHEMA}.${LEDGER_TABLE} (id) VALUES ('${id}')`,
    ]);
    applied.push(seed.id);
  }
  return applied;
}
