import path from "node:path";
import { migrate } from "drizzle-orm/neon-http/migrator";

import { createDb } from "../db/client";
import { createNeonExecutor } from "../db/tooling/executor";
import { computeStatus, readAppliedCreatedAt, readJournal, verifyMigrationState } from "../db/tooling/migrate";

/**
 * Applies the committed migrations that are pending, using the same journal rule as drizzle's migrator, and
 * returns what was applied. It refuses a database whose history has entries the journal does not know (someone
 * changed it outside the process). Shared by `db:migrate` (dev, qa, stage) and `db:migrate:prod`, so both apply
 * migrations identically; the guards that decide whether to run live with their callers.
 */
export async function applyPendingMigrations(databaseUrl: string, log: (line: string) => void = console.log): Promise<string[]> {
  const migrationsFolder = path.resolve(process.cwd(), "drizzle");
  const journal = readJournal(migrationsFolder);
  const exec = createNeonExecutor(databaseUrl);
  const before = computeStatus(journal, await readAppliedCreatedAt(exec));
  if (before.unknownInDatabase > 0) {
    throw new Error(`${before.unknownInDatabase} applied migration(s) are not in the committed journal; refusing.`);
  }
  if (before.pending.length === 0) {
    log("no pending migrations; nothing applied.");
    return [];
  }
  const tags = before.pending.map((e) => e.tag);
  log(`applying ${tags.length} migration(s): ${tags.join(", ")}`);
  await migrate(createDb(databaseUrl), { migrationsFolder });
  const after = computeStatus(journal, await readAppliedCreatedAt(exec));
  const problems = verifyMigrationState(after);
  if (problems.length > 0) throw new Error(`after applying, the database is not at the committed migrations: ${problems.join("; ")}`);
  log(`done; applied=${after.applied.length} pending=${after.pending.length}.`);
  return tags;
}
