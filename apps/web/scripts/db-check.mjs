// Read-only Neon connectivity check. Runs a single `SELECT 1`; it never reads
// application tables and never writes or changes schema.
// Usage: pnpm db:check   (requires DATABASE_ENV=dev and DATABASE_URL in .env.local)
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

// Explicit environment selection (see /docs/database.md section 2). This check
// is deliberately limited to dev; it refuses qa, stage, and prod.
if (process.env.DATABASE_ENV !== "dev") {
  console.error("Refusing to run: DATABASE_ENV must be exactly 'dev'.");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to apps/web/.env.local.");
  process.exit(1);
}

try {
  const sql = neon(process.env.DATABASE_URL);
  const [row] = await sql.query("SELECT 1 AS ok");
  if (row?.ok !== 1) throw new Error("Unexpected response from database.");
  console.log("OK: connected to Neon (DATABASE_ENV=dev), SELECT 1 succeeded.");
} catch (error) {
  // Report only the error message; never echo the connection string.
  console.error(
    "Connection failed:",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exit(1);
}
