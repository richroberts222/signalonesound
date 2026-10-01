import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  assertDestructiveAllowed,
  EnvValidationError,
  parseDatabaseEnv,
  type AppEnv,
  type DatabaseEnvConfig,
  type EnvSource,
} from "@signalone/shared";

import type { SqlExecutor } from "./executor";

/**
 * Environments the local migration runner may target. prod is never allowed:
 * production migrations are a deliberate, reviewed process (see
 * /docs/database.md section 10 and 12.3), not local tooling.
 */
export const MIGRATE_ALLOWED_ENVS: readonly AppEnv[] = ["dev", "qa", "stage"];

export type MigrationOperation = "db:migrate" | "db:migrate:status" | "db:migrate:verify";

/**
 * Fail-closed guard for the migration runner. Same rules as
 * `resolveToolingTarget` (explicit DATABASE_ENV/DATABASE_URL, APP_ENV equals
 * DATABASE_ENV, never on Vercel, explicit `--env=<name>` matching
 * DATABASE_ENV), with the migration allow-list. Safety is never inferred from
 * DATABASE_URL.
 */
export function resolveMigrationTarget(
  source: EnvSource,
  operation: MigrationOperation,
  requestedEnv: string | undefined,
): DatabaseEnvConfig {
  const config = parseDatabaseEnv(source);
  const issues: string[] = [];

  const appEnv = source.APP_ENV;
  if (appEnv !== undefined && appEnv !== "" && appEnv !== config.databaseEnv) {
    issues.push(`${operation}: APP_ENV must equal DATABASE_ENV (${config.databaseEnv}); refusing.`);
  }
  if (source.VERCEL_ENV !== undefined && source.VERCEL_ENV !== "") {
    issues.push(`${operation}: must not run on Vercel (VERCEL_ENV is set); refusing.`);
  }
  if (issues.length > 0) throw new EnvValidationError(issues);

  assertDestructiveAllowed(config.databaseEnv, MIGRATE_ALLOWED_ENVS, operation);

  if (!requestedEnv) {
    throw new EnvValidationError([
      `${operation}: pass the target explicitly with --env=<${MIGRATE_ALLOWED_ENVS.join("|")}>; refusing.`,
    ]);
  }
  if (requestedEnv !== config.databaseEnv) {
    throw new EnvValidationError([`${operation}: --env does not match DATABASE_ENV; refusing.`]);
  }
  return config;
}

export type JournalEntry = { idx: number; tag: string; when: number };

/** Reads the committed Drizzle journal (`<folder>/meta/_journal.json`). */
export function readJournal(migrationsFolder: string): JournalEntry[] {
  const file = path.join(migrationsFolder, "meta", "_journal.json");
  // A new application has no migrations until its first `db:generate`.
  if (!existsSync(file)) return [];
  const raw = readFileSync(file, "utf8");
  const parsed = JSON.parse(raw) as { entries?: JournalEntry[] };
  return parsed.entries ?? [];
}

export type MigrationStatus = {
  applied: JournalEntry[];
  pending: JournalEntry[];
  /** Rows in the database history newer than anything in the committed journal. */
  unknownInDatabase: number;
};

/**
 * Drizzle records one row per applied migration in `drizzle.__drizzle_migrations`
 * with `created_at` = the journal entry's `when`. A journal entry is pending
 * when it is newer than the latest applied row (the same rule drizzle's
 * migrator uses).
 */
export function computeStatus(journal: readonly JournalEntry[], appliedCreatedAt: readonly number[]): MigrationStatus {
  const latest = appliedCreatedAt.length > 0 ? Math.max(...appliedCreatedAt) : -Infinity;
  const known = new Set(journal.map((e) => e.when));
  return {
    applied: journal.filter((e) => e.when <= latest),
    pending: journal.filter((e) => e.when > latest),
    unknownInDatabase: appliedCreatedAt.filter((w) => !known.has(w)).length,
  };
}

/** Read-only: lists applied migration timestamps (empty if never migrated). */
export async function readAppliedCreatedAt(exec: SqlExecutor): Promise<number[]> {
  const exists = await exec.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations'`,
  );
  if (exists.length === 0) return [];
  const rows = await exec.query(`SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at`);
  return rows.map((r) => Number(r.created_at));
}

/**
 * Read-only verification that the database is exactly at the committed
 * migrations: nothing pending, and no applied history unknown to the journal.
 * Application-agnostic, so it works unchanged for any schema (a new app starts
 * with an empty journal). Returns problems; empty means verified.
 */
export function verifyMigrationState(status: MigrationStatus): string[] {
  const problems: string[] = [];
  if (status.pending.length > 0) {
    problems.push(`${status.pending.length} pending migration(s): ${status.pending.map((e) => e.tag).join(", ")}`);
  }
  if (status.unknownInDatabase > 0) {
    problems.push(`${status.unknownInDatabase} applied migration(s) are not in the committed journal`);
  }
  return problems;
}
