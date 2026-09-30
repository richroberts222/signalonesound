import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

import { getDatabaseEnv } from "./db/env";

config({ path: ".env.local" });

// Local tooling must never touch prod. Production migrations are a deliberate,
// reviewable process that is not yet documented (see /docs/database.md section 10).
if (getDatabaseEnv() === "prod") {
  throw new Error("Refusing to run drizzle-kit against DATABASE_ENV=prod.");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL },
});
