import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getDatabaseEnv } from "./env";
import * as schema from "./schema";

// Server-only. Import this only from approved data-access helpers, never from
// UI components (see /docs/database.md and /docs/data-fetching.md).
const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set.");
}
getDatabaseEnv(); // fail fast if the target environment is not declared

export const db = drizzle(neon(url), { schema });
