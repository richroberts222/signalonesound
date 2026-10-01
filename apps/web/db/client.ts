import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

// Driver wiring only. Not "server-only" so tooling (db:check) and tests can use
// it; application code obtains the instance through `getDb()` in `db/index.ts`.
// neon-http has no interactive transactions; use `db.batch([...])` for atomic
// multi-statement writes (see /docs/database.md section 18).
export function createDb(databaseUrl: string) {
  return drizzle(neon(databaseUrl), { schema });
}

export type Database = ReturnType<typeof createDb>;
