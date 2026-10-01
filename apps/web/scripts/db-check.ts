// Read-only Neon connectivity check. Runs a single `SELECT 1`; it never reads
// application tables and never writes or changes schema.
// Usage: pnpm db:check   (requires DATABASE_ENV=dev and DATABASE_URL in .env.local)
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { assertDestructiveAllowed, EnvValidationError } from "@signalone/shared";

import { loadDatabaseEnv } from "../db/env";

config({ path: ".env.local" });

async function main() {
  const { databaseEnv, databaseUrl } = loadDatabaseEnv();
  // Deliberately limited to dev; refuses qa, stage, and prod.
  assertDestructiveAllowed(databaseEnv, ["dev"], "db:check");

  const sql = neon(databaseUrl);
  const [row] = await sql.query("SELECT 1 AS ok");
  if (row?.ok !== 1) throw new Error("Unexpected response from database.");
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
