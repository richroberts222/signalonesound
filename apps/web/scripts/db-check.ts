// Read-only Neon connectivity check. Runs a single `SELECT 1`; it never reads
// application tables and never writes or changes schema.
// Usage: pnpm db:check   (requires DATABASE_ENV=dev and DATABASE_URL in .env.local)
import { config } from "dotenv";
import { assertDestructiveAllowed, EnvValidationError } from "@signalone/shared";

import { createDb } from "../db/client";
import { loadDatabaseEnv } from "../db/env";
import { checkDatabaseConnection } from "../db/health";

config({ path: ".env.local" });

async function main() {
  const { databaseEnv, databaseUrl } = loadDatabaseEnv();
  // Deliberately limited to dev; refuses qa, stage, and prod.
  assertDestructiveAllowed(databaseEnv, ["dev"], "db:check");

  await checkDatabaseConnection(createDb(databaseUrl));
  console.log("OK: connected to Neon (DATABASE_ENV=dev), SELECT 1 succeeded.");
}

main().catch((error: unknown) => {
  // Report only the message; never echo the connection string.
  if (error instanceof EnvValidationError) {
    console.error(error.message);
  } else {
    console.error(
      "Connection failed:",
      error instanceof Error ? error.message : "unknown error",
    );
  }
  process.exit(1);
});
