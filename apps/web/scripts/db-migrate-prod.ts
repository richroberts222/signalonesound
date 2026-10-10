// Applies the committed, reviewed migrations to PRODUCTION. Runs only inside the manual "Migrate production"
// GitHub workflow (.github/workflows/migrate-production.yml); every other place refuses (docs/database.md 12.3).
//   pnpm --filter web db:migrate:prod -- --env=prod
import { EnvValidationError } from "@signalone/shared";

import { applyPendingMigrations } from "./apply-migrations";
import { parseEnvFlag } from "../db/tooling/guard";
import { resolveProdMigrationTarget } from "../db/tooling/migrate-prod";

async function main() {
  try {
    // No .env.local is read: production configuration comes only from the workflow.
    const target = resolveProdMigrationTarget(process.env, parseEnvFlag(process.argv.slice(2)));
    console.log(`db:migrate:prod: target=${target.databaseEnv}`);
    await applyPendingMigrations(target.databaseUrl, (line) => console.log(`db:migrate:prod: ${line}`));
  } catch (error) {
    // Never echo connection strings; report only the message.
    console.error(error instanceof EnvValidationError ? error.message : `db:migrate:prod failed: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exit(1);
  }
}

void main();
