import { parseDatabaseEnv } from "@signalone/shared";

// Database configuration is validated by the shared environment module
// (see /docs/environment.md). Environment selection is explicit; it is never
// inferred from the DATABASE_URL hostname (see /docs/database.md section 2).
// Deliberately not "server-only" so Node tooling (drizzle-kit, db:check) can
// use it; only server code and tooling should ever import from `db/`.
export function loadDatabaseEnv() {
  return parseDatabaseEnv(process.env);
}
