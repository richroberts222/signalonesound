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

---

# 14. Environment Variables

Database connections must be supplied through environment configuration.

Environment identity is `APP_ENV` and validation lives in `apps/web/lib/env` (see `/docs/environments.md`). The standard server-side variable should be:

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

The exact Preview-to-database policy should be documented before database-backed Preview deployments become part of normal development.

Until that policy is established, Claude must not assume that every Vercel Preview should automatically connect to `dev`, `qa`, `stage`, or `prod`.

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
- Persistent `dev`, `qa`, `stage`, and production environments are being established.
- Clerk authentication is operational.
- Drizzle is the selected ORM/schema/migration layer.
- Detailed Signal One application schema design is still to be developed.

Code status: `apps/web/db` contains `index.ts` (server-only Drizzle client on `neon-http`), and an empty `schema.ts`. `apps/web/drizzle.config.ts` refuses `prod`. No migrations exist. `pnpm --filter web db:check` runs a read-only `SELECT 1` against `dev` only. Reset/seed tooling, a transaction helper, and a production migration procedure do not exist yet; see `/docs/boilerplate-gap-report.md`.

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
