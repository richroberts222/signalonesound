import { boolean, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

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

// S1 identity and policy (docs/features/s1-identity-and-policy.md). `user_profile` is the application
// record for a Clerk user; Clerk stays the source of truth for identity, so the email address is read
// from Clerk when needed and never copied here. Never expose these row types to clients.
export const userProfile = pgTable("user_profile", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  displayName: text("display_name"),
  emailPref: boolean("email_pref").notNull().default(false),
  timeZone: text("time_zone"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Which version of each policy a member accepted, and when. Kept for the legal period; on account
// deletion the link to the person is removed (user_id is replaced by an anonymous marker).
export const policyAcceptance = pgTable(
  "policy_acceptance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    policyKind: text("policy_kind").notNull(),
    version: text("version").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("policy_acceptance_user_idx").on(t.userId)],
);
