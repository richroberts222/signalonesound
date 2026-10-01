// Read-only: verifies the database schema matches the committed migrations'
// expectations (currently the generic `migration_proof` table). Usage:
//   pnpm --filter web db:migrate:verify --env=dev
import { runMigrationTooling } from "../db/tooling/cli";
import { createNeonExecutor } from "../db/tooling/executor";
import { verifyMigrationProofSchema } from "../db/tooling/migrate";

void runMigrationTooling("db:migrate:verify", async (target) => {
  const problems = await verifyMigrationProofSchema(createNeonExecutor(target.databaseUrl));
  if (problems.length > 0) {
    console.error(`db:migrate:verify: FAILED\n${problems.join("\n")}`);
    process.exit(1);
  }
  console.log("db:migrate:verify: migration_proof table and columns match the schema.");
});
