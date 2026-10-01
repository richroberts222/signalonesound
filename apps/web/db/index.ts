import "server-only";

import { createDb, type Database } from "./client";
import { loadDatabaseEnv } from "./env";

export type { Database } from "./client";
export { DatabaseError, withDbErrors } from "./errors";
export { checkDatabaseConnection } from "./health";

// Server-only. Import this only from approved data-access helpers, never from
// UI components (see /docs/database.md and /docs/data-fetching.md).
// Lazy so `next build` works without runtime secrets; fails fast with a clear
// message on first use if the environment is invalid.
let cached: Database | undefined;

export function getDb(): Database {
  return (cached ??= createDb(loadDatabaseEnv().databaseUrl));
}
