// Read-only: verifies the --env database is exactly at the committed migrations
// (nothing pending, no unknown history). Usage:
//   pnpm --filter web db:migrate:verify --env=dev
import path from "node:path";

import { runMigrationTooling } from "../db/tooling/cli";
import { createNeonExecutor } from "../db/tooling/executor";
import { computeStatus, readAppliedCreatedAt, readJournal, verifyMigrationState } from "../db/tooling/migrate";

void runMigrationTooling("db:migrate:verify", async (target) => {
  const journal = readJournal(path.resolve(process.cwd(), "drizzle"));
  const status = computeStatus(journal, await readAppliedCreatedAt(createNeonExecutor(target.databaseUrl)));
  const problems = verifyMigrationState(status);
  if (problems.length > 0) {
    console.error(`db:migrate:verify: FAILED\n${problems.join("\n")}`);
    process.exit(1);
  }
  console.log(`db:migrate:verify: database matches the committed migrations (${status.applied.length} applied).`);
});
