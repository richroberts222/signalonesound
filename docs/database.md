# Signal One Database Rules

## Purpose

This document defines the database implementation rules for Signal One.

`/docs/architecture-rules.md` remains the governing high-level architecture document. This document provides the detailed database rules that implementations must follow.

Signal One uses:

- PostgreSQL hosted by Neon
- Drizzle ORM for schema definition and database access
- Clerk for authentication and identity
- Server-side database access only

The database architecture must support Web, Android, and iPhone as clients of the same Signal One platform.

---

# 1. Architectural Boundary

The standard database flow is:

```text
Web / Mobile
     |
     v
API / Server Boundary
     |
     v
Business / Service Logic
     |
     v
Data Access Helpers
     |
     v
Drizzle ORM
     |
     v
PostgreSQL / Neon
```

Client UI code MUST NOT access Neon or Drizzle directly.

Database credentials MUST remain server-side.

Database-specific implementation details should remain behind the server/data-access boundary so that clients depend on application contracts rather than database structure.

---

# 2. Database Environments

Signal One uses four logical database environments:

```text
prod    = real production application data
stage   = production-like pre-release validation
qa      = controlled testing, automation, reset, and seed workflows
dev     = active local/development work
```

The Neon project should maintain corresponding persistent branches.

The intended mapping is:

```text
Local development          -> dev
Automated testing / QA     -> qa
Pre-production validation  -> stage
Production                 -> prod
```

If the Neon default production branch is temporarily named `production`, documentation and configuration may continue to reference the logical environment as `prod` until the branch is deliberately renamed.

Environment selection MUST be explicit through configuration. Application code MUST NOT guess the environment from a Neon endpoint hostname.

---

# 3. Environment Isolation

Each environment MUST have its own database connection configuration.

A developer working locally MUST NOT normally connect to `prod`.

Automated tests and test-data generation MUST NOT operate against `prod`.

QA reset/seed operations MUST target `qa` unless a documented task explicitly requires a safe development reset.

Stage should be treated as production-like and should not be used as a disposable test database.

Production contains real application data and is protected from destructive development operations.

Connection strings and passwords MUST NOT be committed to Git.

---

# 4. Production Protection

`prod` is a protected database environment.

Any script or command capable of destructive behavior, including reset, truncate, bulk delete, reseed, schema recreation, or destructive test setup, MUST refuse to run against `prod`.

Protection MUST NOT depend only on a developer remembering to select the correct database.

Where practical, destructive tooling should require positive identification of an allowed environment such as `dev` or `qa`.

Production schema changes must occur through the documented migration process rather than ad-hoc manual modification.

---

# 5. Drizzle Ownership

Drizzle ORM is the standard database schema and query layer.

Drizzle should own:

- PostgreSQL table definitions
- Column definitions
- Relationships
- Constraints
- Index definitions
- Schema migrations
- Application database queries through approved data-access helpers

Do not create a second competing schema-management system without an explicit architectural decision.

Raw SQL MUST NOT be scattered through application code.

If raw SQL becomes genuinely necessary for a capability Drizzle cannot reasonably express, it must remain server-side, be isolated behind the data-access layer, and be documented.

---

# 6. Schema Design

Schemas should model stable Signal One domain concepts rather than UI screens.

Tables should be normalized where practical while avoiding unnecessary complexity.

Schema design must consider:

- Data integrity
- Relationships
- Required versus optional data
- Unique constraints
- Foreign keys where appropriate
- Indexes based on actual query requirements
- Timestamps where meaningful
- Existing data
- Migration safety
- API compatibility
- Web compatibility
- Mobile compatibility
- Testing requirements

Do not add speculative tables or columns solely because they might be useful someday.

Schema changes are expected over the life of the application. Application layers should therefore depend on stable data-access and API contracts rather than spreading table structure throughout the codebase.

---

# 7. Clerk Identity and Database Data

Clerk is the authentication and identity authority.

PostgreSQL MUST NOT duplicate Clerk password handling, authentication credentials, or independent login logic.

When application records belong to or are created by a user, the authenticated Clerk user ID may be stored on the appropriate Signal One record.

For example:

```text
Clerk authenticated user
        |
        v
Clerk user ID
        |
        v
Server-authorized operation
        |
        v
Signal One record containing the relevant user ownership/reference
```

A separate Signal One `users` table MUST NOT be created merely to duplicate Clerk identity data.

A Signal One user/profile table may be introduced later if Signal One requires application-specific user data that belongs in PostgreSQL. That decision must be based on an actual application requirement.

The server MUST derive trusted user identity from Clerk authentication. Client-supplied user IDs MUST NOT be trusted as proof of identity or ownership.

---

# 8. Data Access Layer

Database queries and mutations must be centralized through approved server-side data-access helpers.

UI components MUST NOT contain database queries.

API handlers, server actions, or server-side business logic should call data-access helpers rather than duplicating Drizzle queries throughout the application.

Data-access functions should have clear responsibilities and stable inputs/outputs.

Example conceptual boundary:

```text
UI
 |
 v
Server/API operation
 |
 v
Business rule
 |
 v
getEvent(...)
createEvent(...)
updateEvent(...)
 |
 v
Drizzle
 |
 v
Neon
```

This boundary is intended to make schema changes easier to absorb without forcing rewrites across every client.

Detailed read behavior belongs in `/docs/data-fetching.md`.

Detailed mutation behavior belongs in `/docs/data-mutations.md`.

---

# 9. Authorization and Ownership

Authentication and authorization are separate concerns.

Clerk establishes who the user is.

Signal One server-side business logic determines what that authenticated user is allowed to read or modify.

Queries involving user-owned or restricted data MUST enforce authorization on the server.

The browser or mobile client MUST NOT be trusted to enforce ownership by filtering records itself.

Where a query is scoped to an authenticated user's data, the trusted Clerk user ID should come from the server-side authenticated session/context.

---

# 10. Migrations

Database schema changes must be versioned through Drizzle migrations.

The migration history is part of the application source and MUST be committed to Git.

Developers should not rely on manually changing Neon tables as the authoritative schema-change process.

A schema change should follow a controlled progression through appropriate environments before production.

Conceptually:

```text
Schema change
    |
    v
Drizzle schema
    |
    v
Generated/reviewed migration
    |
    v
dev
    |
    v
qa
    |
    v
stage
    |
    v
prod
```

The exact automation for promotion may evolve, but production migrations must be deliberate and reviewable.

Migration files that have already been applied to shared environments should not be casually rewritten. Corrective changes should normally be made with a new migration.

---

# 11. Drizzle Push vs. Migrations

Convenience commands that directly synchronize schema state may be useful during early experimentation, but they MUST NOT become the production schema-management strategy.

Production and production-like environments should use reviewable migrations.

Before using any Drizzle command that can modify schema state, confirm which Neon environment the configured `DATABASE_URL` targets.

Claude MUST NOT execute a schema-changing database command merely because configuration exists. It must first determine the intended environment and the impact of the operation.

---

# 12. Reset and Seed Strategy

Signal One must provide a repeatable way to create known development/test data.

Reset and seed tooling should support:

- `dev` for developer-controlled development data when appropriate
- `qa` for repeatable automated/manual test scenarios

Reset/seed tooling MUST NOT operate against `prod`.

Stage should normally receive production-like schema and controlled validation data rather than being repeatedly wiped as a disposable environment.

Seed data should be deterministic enough that automated tests can rely on known scenarios.

Resetting test data must not destroy migration history or required database configuration.

The eventual reset workflow should make the intended target obvious and should fail safely when environment identity is uncertain.

## 12.1 Database lifecycle across environments

Schema/code promotion and application data movement are separate things and are never conflated.

| Environment | Schema arrives by | Data | Reset / seed |
| --- | --- | --- | --- |
| `dev` | Drizzle migrations (first target) | Disposable, developer-controlled | Allowed |
| `qa` | Same migrations, promoted after dev | Predictable, repeatable test scenarios | Allowed |
| `stage` | Same migrations, promoted after qa | Production-like; not disposable | **Never** reset/seeded by these tools |
| `prod` | Same migrations, deliberate reviewed promotion last | Real data | **Never** reset/seeded; never touched by tooling or tests |

* **Schema promotion**: the committed Drizzle migration files move `dev -> qa -> stage -> prod` (section 10). `drizzle-kit push` is never the strategy for qa/stage/prod. The migration workflow is in section 12.3.
* **Data is never promoted.** Data is not copied between environments by these tools. dev and qa data is created by seeds; stage data is controlled validation data; prod data is real and only changed by the application.
* **Reset** removes data only (rows in `public` plus the tooling ledger). It keeps the schema, the `drizzle` migration-history schema, and the database. It never drops tables or schemas.
* **Seed** applies named, idempotent seeds recorded in a ledger (`signalone_tooling.seed_runs`, created by the tooling, not application schema). Re-running seed is a no-op; `db:refresh` (reset then seed) returns an environment to its known state.

## 12.2 Reset/seed tooling (`apps/web/db/tooling`)

Commands (run from the repo root; `--env` is mandatory):

```text
pnpm --filter web db:reset   --env=dev|qa   # truncate data
pnpm --filter web db:seed    --env=dev|qa   # apply pending seeds
pnpm --filter web db:refresh --env=dev|qa   # reset, then seed
```

Fail-closed guard (`resolveToolingTarget`), every condition must hold or the command exits non-zero before any connection is opened:

1. `DATABASE_ENV` and `DATABASE_URL` validate (`parseDatabaseEnv`); missing or invalid identity is refused.
2. `APP_ENV`, if set, equals `DATABASE_ENV`.
3. `VERCEL_ENV` is unset (never runs on Vercel).
4. Target is in the allow-list `dev`, `qa` (`assertDestructiveAllowed`); `prod` is refused as protected, `stage` as not allowed.
5. `--env=<name>` is passed and equals `DATABASE_ENV`, so the operator states the target.

Safety is never inferred from `DATABASE_URL`; the guard does not parse it beyond protocol validation. Errors never echo connection strings.

Adding seed data: add a `Seed` (id, description, deterministic statements) to `SEEDS` in `db/tooling/seed.ts` together with the migration that creates its tables. Seeds must be idempotent per ledger id and use fake/test-safe data only. Raw SQL stays inside `db/tooling` (tooling-only, not application code). No domain seed data exists yet; the only seed is the generic `tooling-smoke` ledger marker.

qa credentials: use a separate `DATABASE_ENV=qa` configuration (see `/docs/environment.md`). The qa reset/seed path is implemented identically but has not been exercised against a real qa database.

---

## 12.3 Migration workflow (`apps/web/drizzle`, `db/tooling/migrate.ts`)

Drizzle migrations are the only authoritative way schema changes reach any environment. Generated SQL and `drizzle/meta` are committed to Git. `drizzle-kit push` is never used (no package script exposes it; a test enforces this).

Commands (run from the repo root; `--env` is mandatory for the ones that connect):

```text
pnpm --filter web db:generate --name=<slug>          # schema.ts -> new SQL migration (no DB changes)
pnpm --filter web db:migrate --env=dev|qa|stage      # apply pending migrations (idempotent)
pnpm --filter web db:migrate:status --env=...        # read-only: applied vs pending
pnpm --filter web db:migrate:verify --env=...        # read-only: nothing pending, no unknown history
```

Guard (`resolveMigrationTarget`) mirrors the reset/seed guard and fails closed before any connection: `DATABASE_ENV`/`DATABASE_URL` must validate; `APP_ENV`, if set, equals `DATABASE_ENV`; `VERCEL_ENV` unset; target in `dev|qa|stage` (`prod` always refused); `--env` equals `DATABASE_ENV`. Safety is never inferred from `DATABASE_URL`. The runner also refuses to apply when the database history contains migrations unknown to the committed journal.

Per-environment workflow (same migration files at every step; **no data is copied**, see 12.1):

1. **Change**: edit `db/schema.ts` (expand first; contract in a later migration).
2. **Generate**: `db:generate`. **Review** the SQL for destructive statements (DROP, type changes, NOT NULL on populated tables) and fix by editing the schema/generating again, or by a hand-written reviewed migration.
3. **DEV**: `db:migrate --env=dev`, then `db:migrate:status` and `db:migrate:verify`. Run again to confirm "no pending migrations". Commit the migration with the schema change.
4. **QA**: after the PR is merged/promoted, `db:migrate --env=qa` with the qa configuration; status/verify; then `db:refresh --env=qa` if test data is wanted.
5. **STAGE**: `db:migrate --env=stage` deliberately by a human with stage configuration; status/verify. Stage data is never reset/seeded. Take/confirm a Neon backup/restore point first.
6. **PROD**: not run by local tooling (refused). A human applies the same reviewed, already-staged migration files through the deliberate production process after a verified backup/restore point exists, then checks status. The exact production automation is not yet defined (undecided).

Migrations already applied to a shared environment are never edited; fix forward with a new migration.

**Forward-only, recovery and rollback.** Migrations are forward-only; Drizzle generates no down migrations. To undo a change, write a new forward migration. If a migration fails mid-way it is not recorded as applied (each runs in a transaction on Postgres), so fix and re-run. If data is damaged or a forward fix is not feasible, recovery is restoring from a Neon backup/point-in-time restore (or a branch from before the change), not reversing migrations. Backups protect data; migrations define schema; a restore returns to an earlier schema+data state, after which the committed migrations bring the schema forward again. Restore procedures themselves are not yet documented/exercised.

---

# 13. Neon Branching

Neon branches are infrastructure environments, not Git feature branches.

A Git branch does not automatically require a corresponding Neon branch.

The persistent Signal One Neon branch strategy is:

```text
prod
├── dev
├── qa
└── stage
```

These environments should remain logically independent even if they share a common Neon ancestor.

Neon branching may be used later for temporary database testing if there is a documented need, but temporary database branches must not become an uncontrolled one-per-feature requirement.

Resetting a Neon child branch from a parent can replace data/state. Such operations must be deliberate and must never be performed against production accidentally.

A Neon child branch starts as a copy of its parent's data. While `prod` is empty this is harmless. **Once `prod` holds real user data, no child branch may be created, or reset from its parent, from `prod`**: that would copy real data into a lower environment. Before real data exists, decide between creating children from an empty baseline and placing `prod` in its own Neon project (audit F-DATA-006, decided together with F-DATA-004).

---

# 14. Environment Variables

Database connections must be supplied through environment configuration.

The standard server-side variable should be:

```text
DATABASE_URL
```

The value differs by environment.

Conceptually:

```text
Local .env configuration      -> dev DATABASE_URL
QA automation configuration   -> qa DATABASE_URL
Staging configuration         -> stage DATABASE_URL
Vercel Production             -> prod DATABASE_URL
```

Actual credentials MUST NOT appear in committed documentation, source files, examples, screenshots intentionally committed to the repository, or GitHub issues.

Provide placeholder examples when documentation needs to demonstrate format.

---

# 15. Vercel and Database Environments

Vercel deployment configuration must map to the appropriate Neon environment.

Production deployments must use the `prod` database connection.

Staging deployments intended as production-like validation must use `stage`.

Preview deployments MUST NOT silently use the production database.

Preview-to-database policy (decided for Issue 19): feature/PR Vercel Previews map to `qa`; local development maps to `dev`; `stage` is the protected final production-like verification environment and is not used for ordinary PR previews; production maps to `prod`. See `/docs/environment.md` and `/docs/deployment.md`.

---

# 16. Shared Web and Mobile Contracts

Web and mobile clients should depend on shared API/data contracts rather than PostgreSQL table definitions.

Database rows are an implementation detail of the backend.

A schema change should not automatically require web and mobile rewrites if the public application contract can remain stable.

Where appropriate, shared TypeScript types and validation schemas may describe API request/response data.

Server-only Drizzle schema definitions MUST NOT be exposed to mobile or browser clients merely for code reuse.

---

# 17. Business Logic

Database access and business rules are related but distinct.

Data-access helpers answer questions such as:

```text
Find this event
Create this event
Update this event
List events for this owner
```

Business logic answers questions such as:

```text
Is this authenticated user allowed to create the event?
Can this user modify this event?
Is this state transition valid?
What application rules must be enforced before persistence?
```

Server-authoritative business rules should be enforced before or as part of database mutations.

Do not bury important application policy exclusively inside UI behavior.

---

# 18. Transactions and Multi-Step Changes

When an operation requires multiple related database changes that must succeed or fail together, use an appropriate PostgreSQL transaction through the supported Drizzle mechanism.

Do not leave partially completed application state when atomic behavior is required.

Transaction use should be driven by real consistency requirements rather than applied unnecessarily to every operation.

Driver decision (Issue 23): Signal One keeps the `neon-http` driver. It is stateless and suited to Vercel serverless/edge. Its limitation is that it does **not** support interactive transactions (`db.transaction(...)` throws "No transactions support in neon-http driver"; this is asserted in `db/db.test.ts`). It does support `db.batch([...])`, which sends several statements in one HTTP request and executes them atomically in a single transaction. Rules:

- Use `db.batch([...])` for atomic multi-statement writes whose statements do not depend on each other's results at runtime.
- Do not call `db.transaction`. If a real requirement needs read-then-write logic inside one transaction, that is an architectural decision: switch that path (or the driver) to Neon's WebSocket `Pool` driver (`drizzle-orm/neon-serverless`), and document it here first. No such requirement exists today, so no driver change was made.

Data-access helpers that accept a database handle should type it as `Database` (from `db/client.ts`) so they can be tested with a fake and reused if the driver later changes.

## Database layer layout (`apps/web/db`)

- `client.ts` - `createDb(url)` and the `Database` type; driver wiring only, not server-only (used by tooling and tests).
- `index.ts` - **server-only** entry point. `getDb()` returns the lazily created, cached Drizzle instance from the validated environment (`db/env.ts`). Application code imports from here; it also re-exports `Database`, `DatabaseError`, `withDbErrors`, `checkDatabaseConnection`.
- `errors.ts` - `DatabaseError` (sanitized message, categorized `kind` such as `unique_violation`, original error kept only as `cause`) and `withDbErrors(operation, fn)`. Data-access helpers wrap queries in it; business/service code maps `DatabaseError.kind` to application errors. Raw driver errors, SQL, and connection details must never reach clients.
- `health.ts` - `checkDatabaseConnection(db)`, a read-only `SELECT 1`.
- `schema.ts` - Drizzle schema (still domain-free).

Domain data-access modules (for example `db/events.ts`, added with their schema) should be small functions taking no arguments beyond their inputs, calling `getDb()` and `withDbErrors`. No generic repository base class is provided or wanted.

---

# 19. Database Portability

Signal One should remain reasonably portable across PostgreSQL hosting providers.

Application code should depend primarily on:

- PostgreSQL behavior
- Drizzle
- Signal One data-access abstractions

Neon-specific functionality may be used when it provides clear value, but Neon-specific assumptions should not be scattered throughout UI, business logic, or shared client contracts.

If Signal One later moves from Neon to another PostgreSQL host, the architecture should minimize the amount of application code that must change.

Portability does not require building a generic database framework or hiding every PostgreSQL capability behind unnecessary abstraction.

---

# 20. Database Performance

Performance decisions should be evidence-driven.

Use indexes when supported by actual query patterns, constraints, sorting, filtering, joins, or measured performance needs.

Avoid premature optimization and speculative denormalization.

When a query becomes important or expensive, evaluate:

- Query shape
- Indexes
- Returned columns
- Pagination
- Join behavior
- Network cost
- Database execution behavior

Do not move database work into the client as a performance shortcut.

---

# 21. Schema and API Evolution

Database schema and public API contracts are separate layers.

A database column or table rename does not necessarily require an API contract change.

When changing schema, determine whether the data-access layer can absorb the change while preserving existing client contracts.

API-breaking changes must consider existing Web, Android, and iPhone clients.

This separation is a primary mechanism for keeping Signal One moldable as the application evolves.

---

# 22. Claude Database Safety Rules

Before making a significant database change, Claude MUST:

1. Read `/docs/architecture-rules.md`.
2. Read this document.
3. Read `/docs/data-fetching.md` and `/docs/data-mutations.md` when relevant.
4. Identify the target database environment.
5. Confirm that the operation cannot accidentally affect `prod`.
6. Determine whether a migration is required.
7. Consider existing data and rollback/recovery implications.
8. Consider API, Web, Android, and iPhone compatibility.
9. Avoid exposing credentials.
10. Report any architectural conflict before implementation.

Claude MUST NOT:

- Invent an undocumented database architecture.
- Connect browser/mobile code directly to Neon.
- Put database credentials into client code.
- Trust client-supplied Clerk user IDs as authorization.
- Reset or seed production.
- Perform destructive production operations as part of testing.
- Scatter raw SQL throughout the application.
- Introduce another ORM or database system without architectural approval.
- Modify schema manually in production as a substitute for migrations.

---

# 23. Current Implementation Status

The intended database architecture is established, but implementation may be introduced incrementally.

At the time this document is established:

- Neon is the selected PostgreSQL host.
- The Signal One Neon project exists.
- The intended `dev`, `qa`, `stage`, and production environments are being established. Which branches actually exist is recorded in `/docs/deployment.md` (only the default `production` branch is confirmed).
- Clerk authentication is operational.
- Drizzle is the selected ORM/schema/migration layer.
- Detailed Signal One application schema design is still to be developed.

Code status (environment validation lives in `@signalone/shared`, see `/docs/environment.md`): `apps/web/db` contains `env.ts`, `client.ts`, `index.ts` (server-only `getDb()` on `neon-http`), `errors.ts`, `health.ts`, and `schema.ts` (domain-free; see the layout in section 18).<!-- boilerplate:proof:start --> It currently contains only the generic proof tables `migration_proof` and `proof_item` (migrations `0000_migration_proof`, `0001_proof_item`), applied to `dev` only; qa, stage and prod have not been migrated.<!-- boilerplate:proof:end --> `apps/web/drizzle.config.ts` refuses `prod`. `pnpm --filter web db:check` runs the read-only `SELECT 1` helper against `dev` only. Transactions are `db.batch` only (section 18). Reset/seed tooling exists (sections 12.1-12.2, `db/tooling`, `db:reset|seed|refresh`); migration tooling exists (section 12.3) but the production application procedure is not automated.

The existence of this document does not imply that every described database capability has already been implemented.

---

# 24. Guiding Principle

The database exists to support the Signal One platform; clients should not be tightly coupled to its physical structure.

Prefer:

```text
Stable client contracts
        |
        v
Server-authoritative behavior
        |
        v
Clear data-access boundary
        |
        v
Drizzle-managed PostgreSQL
```

The database will evolve.

The architecture must allow it to evolve without requiring Signal One to be reinvented every time the schema changes.
