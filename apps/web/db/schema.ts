import { integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

// Domain-free. Signal One schema design has not been established yet.
// `migration_proof` exists only to prove the migration workflow (Issue 43); it
// holds no application data and is not a domain table.
export const migrationProof = pgTable("migration_proof", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  note: text("note").notNull().default("migration-proof"),
});

// `proof_item` exists only to prove the full vertical slice (Issue 49). It is a
// disposable, generic table, not a domain entity. Rows are owned by a Clerk user
// ID; the unique (owner_id, label) constraint exercises the unique-violation ->
// `conflict` mapping end to end. Never expose this row type to clients.
export const proofItem = pgTable(
  "proof_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id").notNull(),
    label: text("label").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("proof_item_owner_label_unique").on(t.ownerId, t.label)],
);
