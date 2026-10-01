// Read-only Neon connectivity check. Runs a single `SELECT 1`; it never reads
// application tables and never writes or changes schema.
// Usage: pnpm db:check   (requires APP_ENV=dev and DATABASE_URL in .env.local)
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

import { EnvError } from "../lib/env/app-env";
import { parseDatabaseEnv } from "../lib/env/server-schema";

config({ path: ".env.local" });

async function main() {
  const { appEnv, databaseUrl } = parseDatabaseEnv(process.env);
  // Deliberately limited to dev; it refuses qa, stage, and prod.
  if (appEnv !== "dev") {
    throw new EnvError(
      `Refusing to run: APP_ENV must be exactly 'dev' (got '${appEnv}').`,
    );
  }
  const sql = neon(databaseUrl);
  const [row] = await sql.query("SELECT 1 AS ok");
  if (row?.ok !== 1) throw new Error("Unexpected response from database.");
  console.log("OK: connected to Neon (APP_ENV=dev), SELECT 1 succeeded.");
}

main().catch((error) => {
  // Report only the error message; never echo the connection string.
  console.error(
    error instanceof EnvError ? "Configuration error:" : "Connection failed:",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exit(1);
});
