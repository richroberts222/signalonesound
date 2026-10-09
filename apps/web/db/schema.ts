import { sql } from "drizzle-orm";
import { boolean, doublePrecision, index, integer, pgTable, primaryKey, text, timestamp, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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
  // True while an admin has suspended the member: they can browse, export and delete, but cannot
  // change events or submit claims (S8). The reason is in the audit log.
  suspended: boolean("suspended").notNull().default(false),
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

// S2 organizations and roles (docs/features/s2-organizations-and-roles.md). A Church/Ministry is
// public once it has an approved manager. `name_key` is the lower-cased name, so a second claim of
// the same name attaches to the same organization instead of creating a duplicate.
export const organization = pgTable("organization", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  nameKey: text("name_key").notNull().unique(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const organizationLink = pgTable(
  "organization_link",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    url: text("url").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [unique("organization_link_position_unique").on(t.orgId, t.position)],
);

// A person's claim on, or standing in, an organization. The person-to-church link is sensitive; it is
// never shown publicly. `contact_email` is kept only until the request is decided.
export const organizationMember = pgTable(
  "organization_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull().default("manager"),
    status: text("status").notNull().default("pending"),
    contactEmail: text("contact_email"),
    requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
    decidedBy: text("decided_by"),
    decisionReason: text("decision_reason"),
  },
  (t) => [
    uniqueIndex("organization_member_open_unique")
      .on(t.orgId, t.userId)
      .where(sql`${t.status} in ('pending', 'approved')`),
    index("organization_member_user_idx").on(t.userId),
  ],
);

// Append-only record of role and moderation actions: who did what to whom, and when.
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").notNull(),
    action: text("action").notNull(),
    subject: text("subject").notNull(),
    detail: text("detail").notNull().default(""),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_at_idx").on(t.at)],
);

// S3 events (docs/features/s3-events-church-portal.md). An event is an exact moment (UTC) plus the
// IANA zone it happens in. A recurring series is expanded into ordinary event rows (at most 104), so
// search, saves and alerts work on plain events; `event_series` only remembers the rule and links the
// rows. `status` is draft, published, cancelled or deleted (deleted is a soft delete kept for the
// audit trail). `version` supports optimistic concurrency. Event data is public once published (T0).
export const eventSeries = pgTable("event_series", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull(),
  rule: text("rule").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const event = pgTable(
  "event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id").notNull(),
    seriesId: uuid("series_id"),
    isException: boolean("is_exception").notNull().default(false),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: text("status").notNull().default("draft"),
    moderationState: text("moderation_state").notNull().default("published"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    timeZone: text("time_zone").notNull(),
    venueName: text("venue_name").notNull(),
    street: text("street").notNull(),
    city: text("city").notNull(),
    state: text("state").notNull(),
    zip: text("zip").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    speakers: text("speakers"),
    directions: text("directions"),
    version: integer("version").notNull().default(1),
    // A random value written with every change. Dependent statements in the same atomic batch run only
    // if it matches, so a stale edit (lost the version race) changes nothing at all.
    editToken: uuid("edit_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("event_org_start_idx").on(t.orgId, t.startsAt, t.id),
    index("event_series_idx").on(t.seriesId),
    index("event_start_idx").on(t.startsAt, t.id),
  ],
);

export const eventRevivalType = pgTable(
  "event_revival_type",
  {
    eventId: uuid("event_id").notNull(),
    typeSlug: text("type_slug").notNull(),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.typeSlug] })],
);

export const eventLink = pgTable(
  "event_link",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull(),
    url: text("url").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [unique("event_link_position_unique").on(t.eventId, t.position)],
);

// Remembers the result of a create for 24 hours, so a double submit returns the first event instead of
// making a second (S3 AC13). Holds only the person's key and the event it produced.
export const idempotencyRecord = pgTable(
  "idempotency_record",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    key: text("key").notNull(),
    eventId: uuid("event_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("idempotency_record_user_key_unique").on(t.userId, t.key)],
);

// S6 saved events and invites (docs/features/s6-saved-events-and-invites.md). A saved event is a
// person-to-church link and is therefore sensitive (T3): it is never shown to anyone but its owner,
// no endpoint reveals who saved an event, and it is removed 30 days after the event is over.
export const savedEvent = pgTable(
  "saved_event",
  {
    userId: text("user_id").notNull(),
    eventId: uuid("event_id").notNull(),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.eventId] }), index("saved_event_event_idx").on(t.eventId)],
);

// An invite link. Only the hash of the random token is kept, with who made it (so they can be limited
// and so deleting their account removes it) and how many people arrived. Who was invited, and who
// arrived, is never recorded.
export const inviteToken = pgTable(
  "invite_token",
  {
    tokenHash: text("token_hash").primaryKey(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    arrivals: integer("arrivals").notNull().default(0),
  },
  (t) => [index("invite_token_creator_idx").on(t.createdBy)],
);

// S8 moderation (docs/features/s8-admin-and-moderation.md). A report names what was reported and why.
// It never records who reported: not an account, not an address. Admin decisions are written to the
// audit log (append-only), not here.
export const report = pgTable(
  "report",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    reason: text("reason").notNull(),
    details: text("details").notNull().default(""),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [index("report_status_idx").on(t.status, t.createdAt)],
);

// Only a keyed hash of the network address and a time, kept at most 24 hours, so one address cannot
// flood the report form. It cannot be turned back into an address and is not linked to any report.
export const reportRateLimit = pgTable(
  "report_rate_limit",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    addressHash: text("address_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("report_rate_limit_idx").on(t.addressHash, t.createdAt)],
);
