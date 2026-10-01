import { sql } from "drizzle-orm";

import type { Database } from "./client";
import { withDbErrors } from "./errors";

// Read-only connectivity proof (`SELECT 1`); touches no application tables.
export async function checkDatabaseConnection(db: Database): Promise<void> {
  await withDbErrors("checkDatabaseConnection", async () => {
    const result = await db.execute(sql`SELECT 1 AS ok`);
    if (result.rows[0]?.ok !== 1) throw new Error("Unexpected response from database.");
  });
}
