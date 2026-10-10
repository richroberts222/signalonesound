// Applies committed Drizzle migrations to the database named by --env. Usage:
//   pnpm --filter web db:migrate --env=dev
// Idempotent: already-applied migrations are skipped. Never uses drizzle-kit push. Production is refused here and is
// applied only by the manual "Migrate production" workflow (db:migrate:prod).
import { applyPendingMigrations } from "./apply-migrations";
import { runMigrationTooling } from "../db/tooling/cli";

void runMigrationTooling("db:migrate", async (target) => {
  await applyPendingMigrations(target.databaseUrl, (line) => console.log(`db:migrate: ${line}`));
});
