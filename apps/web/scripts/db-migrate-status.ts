// Read-only: reports applied vs pending migrations for the --env database. Usage:
//   pnpm --filter web db:migrate:status --env=dev
import path from "node:path";

import { runMigrationTooling } from "../db/tooling/cli";
import { createNeonExecutor } from "../db/tooling/executor";
import { computeStatus, readAppliedCreatedAt, readJournal } from "../db/tooling/migrate";

void runMigrationTooling("db:migrate:status", async (target) => {
  const journal = readJournal(path.resolve(process.cwd(), "drizzle"));
  const status = computeStatus(journal, await readAppliedCreatedAt(createNeonExecutor(target.databaseUrl)));
  console.log(`applied (${status.applied.length}): ${status.applied.map((e) => e.tag).join(", ") || "none"}`);
  console.log(`pending (${status.pending.length}): ${status.pending.map((e) => e.tag).join(", ") || "none"}`);
  if (status.unknownInDatabase > 0) {
    console.error(`WARNING: ${status.unknownInDatabase} applied migration(s) are not in the committed journal.`);
    process.exit(1);
  }
});
