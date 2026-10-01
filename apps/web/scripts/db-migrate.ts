// Applies committed Drizzle migrations to the database named by --env. Usage:
//   pnpm --filter web db:migrate --env=dev
// Idempotent: already-applied migrations are skipped. Never uses drizzle-kit push.
import path from "node:path";
import { migrate } from "drizzle-orm/neon-http/migrator";

import { createDb } from "../db/client";
import { runMigrationTooling } from "../db/tooling/cli";
import { createNeonExecutor } from "../db/tooling/executor";
import { computeStatus, readAppliedCreatedAt, readJournal } from "../db/tooling/migrate";

const migrationsFolder = path.resolve(process.cwd(), "drizzle");

void runMigrationTooling("db:migrate", async (target) => {
  const journal = readJournal(migrationsFolder);
  const exec = createNeonExecutor(target.databaseUrl);
  const before = computeStatus(journal, await readAppliedCreatedAt(exec));
  if (before.unknownInDatabase > 0) {
    throw new Error(`${before.unknownInDatabase} applied migration(s) are not in the committed journal; refusing.`);
  }
  if (before.pending.length === 0) {
    console.log("db:migrate: no pending migrations; nothing applied.");
    return;
  }
  console.log(`db:migrate: applying ${before.pending.length} migration(s): ${before.pending.map((e) => e.tag).join(", ")}`);
  await migrate(createDb(target.databaseUrl), { migrationsFolder });
  const after = computeStatus(journal, await readAppliedCreatedAt(exec));
  console.log(`db:migrate: done; applied=${after.applied.length} pending=${after.pending.length}.`);
});
