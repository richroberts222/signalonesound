import { integer, pgTable, text } from "drizzle-orm/pg-core";

// Domain-free. Signal One schema design has not been established yet.
// `migration_proof` exists only to prove the migration workflow (Issue 43); it
// holds no application data and is not a domain table.
export const migrationProof = pgTable("migration_proof", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  note: text("note").notNull().default("migration-proof"),
});
