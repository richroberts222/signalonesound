import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { loadDatabaseEnv } from "./env";
import * as schema from "./schema";

// Server-only. Import this only from approved data-access helpers, never from
// UI components (see /docs/database.md and /docs/data-fetching.md).
const { databaseUrl } = loadDatabaseEnv(); // fails fast with a clear message

export const db = drizzle(neon(databaseUrl), { schema });
