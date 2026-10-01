import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { assertDestructiveAllowed } from "@signalone/shared";

import { loadDatabaseEnv } from "./db/env";

config({ path: ".env.local" });

const { databaseEnv, databaseUrl } = loadDatabaseEnv();

// Local tooling must never touch prod. Production migrations are a deliberate,
// reviewable process (see /docs/database.md sections 10 and 12.3). This config
// is used by `db:generate` only; migrations are applied by `db:migrate`, and
// `drizzle-kit push` is never used (no script exposes it).
assertDestructiveAllowed(databaseEnv, ["dev", "qa", "stage"], "drizzle-kit");

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
});
