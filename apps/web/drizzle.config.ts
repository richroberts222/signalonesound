import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

import { assertNotProd } from "./lib/env/app-env";
import { parseDatabaseEnv } from "./lib/env/server-schema";

config({ path: ".env.local" });

const { appEnv, databaseUrl } = parseDatabaseEnv(process.env);

// Local tooling must never touch prod. Production migrations are a deliberate,
// reviewable process that is not yet documented (see /docs/database.md section 10).
assertNotProd(appEnv, "run drizzle-kit");

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
});
