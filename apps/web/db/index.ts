import "server-only";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getDatabaseEnv } from "@/lib/env/server";
import * as schema from "./schema";

// Server-only. Import this only from approved data-access helpers, never from
// UI components (see /docs/database.md and /docs/data-fetching.md).
export const db = drizzle(neon(getDatabaseEnv().databaseUrl), { schema });
