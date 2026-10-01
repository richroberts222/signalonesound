import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { assertDestructiveAllowed } from "@signalone/shared";

import { loadDatabaseEnv } from "./db/env";

config({ path: ".env.local" });

const { databaseEnv, databaseUrl } = loadDatabaseEnv();

// Local tooling must never touch prod. Production migrations are a deliberate,
// reviewable process that is not yet documented (see /docs/database.md section 10).
assertDestructiveAllowed(databaseEnv, ["dev", "qa", "stage"], "drizzle-kit");

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
});
