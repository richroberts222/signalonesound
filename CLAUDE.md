# CLAUDE.md

This file provides guidance to Claude Code when working in the Signal One repository.

---

# 1. Project Overview

Signal One is a multi-client application consisting of:

* Web application
* Android application
* iPhone application
* Shared backend/API
* Shared authentication
* Shared data layer

Signal One is **one platform with multiple clients**, not three independent applications.

The architecture must allow Web, Android, and iPhone to work together while sharing the appropriate backend, authentication, data, contracts, and business rules.

---

# 2. Architectural Authority

Before implementing significant functionality, Claude MUST understand the applicable architectural rules.

The primary architectural rules are:

`/docs/architecture-rules.md`

This document takes precedence over assumptions about how a particular framework or feature should be implemented.

Before making an architectural change, Claude MUST read the relevant documentation in `/docs`.

---

# 3. Documentation-First Development

Before generating or significantly modifying code, Claude MUST check the relevant documentation in `/docs`.

Expected documentation includes:

* `/docs/architecture-rules.md`
* `/docs/auth.md`
* `/docs/api.md`
* `/docs/database.md`
* `/docs/web.md`
* `/docs/mobile.md`
* `/docs/shared-code.md`
* `/docs/testing.md`
* `/docs/deployment.md`
* `/docs/git-workflow.md`
* `/docs/ui.md`
* `/docs/data-fetching.md`
* `/docs/data-mutations.md`
* `/docs/routing.md`
* `/docs/server-components.md`
* `/docs/issues.md` (required whenever working on a GitHub issue or PR; defines the `docs/notes.md` handoff rule)
* `/docs/product-development.md` (product delivery process; required for product feature work)
* `/docs/naming-conventions.md` (authoritative for naming and domain terminology)
* `/docs/product/product-plan.md` and `/docs/product/roadmap.md` (product direction and sequencing; `/docs/product/source-product-plan.md` is the preserved source)
* `/docs/features/` (approved feature specifications)

Not all of these documents may exist yet.

### Empty or Missing Documentation

**If a referenced rule/documentation file exists but is empty, it means that the project has not yet established rules for that area. An empty file MUST NOT be interpreted as containing rules or requirements.**

**If a referenced documentation file does not exist, do not invent its contents or assume undocumented requirements.**

When a relevant document exists and contains rules, follow those rules.

If a missing or empty document is necessary to make an architectural decision, identify that gap and determine whether the decision can safely be made from the existing architecture documentation.

If it cannot be safely determined, request clarification rather than inventing an architectural rule.

---

# 4. Architecture Compatibility

Signal One must maintain compatibility across the entire platform.

Whenever adding, removing, replacing, or significantly modifying an architectural component, Claude MUST consider:

* Web
* Android
* iPhone
* API
* Authentication
* Database
* Shared code
* Business logic
* Testing
* Deployment
* Environment configuration

Use `/docs/architecture-rules.md` for the required compatibility process.

Do not optimize one client at the expense of the platform as a whole.

If a proposed implementation creates an architectural conflict, stop and explain the conflict before proceeding.

---

# 5. Technology Architecture

The intended architecture includes:

### Web

* Next.js
* React
* TypeScript
* Next.js App Router
* Tailwind CSS where appropriate
* Vercel deployment

### Mobile

* React Native
* Expo
* TypeScript
* Android
* iPhone

### Authentication

* Clerk

### Backend

* Next.js server-side functionality and API routes where appropriate
* Server-authoritative business logic
* APIs designed for use by Web and Mobile

### Database

* PostgreSQL
* Neon
* Drizzle ORM

### Source Control

* Git
* GitHub
* Pull Requests

### Development Agent

* Claude Code

These technologies are architectural defaults, not permission to introduce incompatible patterns.

Before replacing a technology or introducing another major framework or service, consult `/docs/architecture-rules.md`.

---

# 6. Backend Boundary

Web, Android, and iPhone are clients of the Signal One backend.

Clients must not directly access the production database.

The intended relationship is:

```text
Web --------\
Android ------> Signal One API ---> Drizzle ---> Neon
iPhone -------/
```

Authentication must be validated at the appropriate server boundary.

Server-side secrets and privileged database access must remain server-side.

---

# 7. Shared Architecture

Where appropriate, Signal One should share:

* API contracts
* TypeScript types
* Validation schemas
* Data models
* Constants
* Authoritative business rules

Do not duplicate server-authoritative business logic independently across Web, Android, and iPhone.

Shared code must not expose server-only functionality or secrets to client applications.

---

# 8. Web and Mobile Independence

Web and mobile may have different:

* User interfaces
* Navigation
* Layouts
* Interaction patterns
* Platform-specific behavior

Do not force web UI architecture onto mobile.

Do not create separate backend/data architectures merely because the user interfaces differ.

---

# 9. Documentation as Source of Truth

The `/docs` directory is part of the project's architecture.

When implementation and documentation disagree:

1. Identify the discrepancy.
2. Determine whether the implementation or documentation is outdated.
3. Do not silently establish a new architectural pattern.
4. Update the appropriate documentation when an architectural decision changes.

Documentation should remain synchronized with the actual architecture.

---

# 10. Git Workflow

Use GitHub and Pull Requests for significant changes.

Claude should:

1. Inspect the issue/request.
2. Read relevant project documentation.
3. Inspect the existing implementation.
4. Work on the appropriate branch.
5. Make the required changes.
6. Run appropriate validation/tests.
7. Commit the changes.
8. Push the branch.
9. Create or update the Pull Request when appropriate.
10. Report what changed and any relevant test/build results.

Do not make significant unreviewed changes directly to `main`.

Detailed Git rules belong in:

`/docs/git-workflow.md`

If `/docs/git-workflow.md` is empty, no additional project-specific Git rules have yet been established there.

---

# 11. Vercel

Vercel is the deployment platform for the Signal One web application and applicable server-side functionality.

Pull Requests should use Vercel preview deployments where available.

A successful deployment does not by itself prove architectural compatibility.

Architectural compatibility must still be evaluated according to `/docs/architecture-rules.md`.

---

# 12. Testing

Testing must protect the complete platform.

When appropriate, consider:

* Unit tests
* API tests
* Database tests
* Web tests
* Mobile tests
* Authentication tests
* Integration tests
* End-to-end tests

Testing requirements are documented in:

`/docs/testing.md`

If `/docs/testing.md` is empty, no additional project-specific testing rules have yet been established there.

---

# 13. Database Safety

Database changes must be handled through the documented database/migration process.

Before modifying the database schema, read:

`/docs/database.md`

The project must maintain a reliable way to:

* Apply migrations
* Seed development/test data
* Reset test data
* Reproduce known test states

Do not destroy migrations or required development configuration when resetting test data.

Database-specific rules belong in `/docs/database.md`.

If `/docs/database.md` is empty, do not invent project-specific database rules beyond the requirements established by the architecture documentation.

---

# 14. Simplicity

Prefer the simplest implementation that satisfies the requirements while preserving the architecture.

Do not introduce additional:

* Frameworks
* Services
* Dependencies
* Databases
* Authentication systems
* Build systems
* Abstraction layers

unless there is a documented reason.

Avoid unnecessary complexity.

---

# 15. Architectural Changes

A feature request does not automatically authorize an architectural change.

If implementation requires a significant architectural decision that is not already documented, Claude should:

1. Identify the architectural decision.
2. Determine the affected components.
3. Check Web compatibility.
4. Check Android compatibility.
5. Check iPhone compatibility.
6. Check API compatibility.
7. Check authentication compatibility.
8. Check database compatibility.
9. Check testing implications.
10. Check deployment implications.
11. Document the decision when appropriate.

If the decision cannot safely be made from existing documentation, stop and request clarification rather than silently choosing an architecture.

---

# 16. Priority Order

When making implementation decisions, use this priority:

1. Existing documented Signal One architecture
2. Existing project conventions
3. Compatibility across all clients
4. Security and data integrity
5. Maintainability
6. Simplicity
7. Feature-specific convenience

A convenient implementation that violates the architecture is not acceptable.

---

# 17. Do Not Assume Undocumented Rules

Claude MUST distinguish between:

* Established project rules
* Technology defaults
* Existing implementation patterns
* Reasonable suggestions
* Undecided architectural questions

Do not turn a suggestion or assumption into a project rule without establishing it in the appropriate documentation.

If something has not yet been decided, it should be treated as **undecided**, not silently assumed.

---

# 18. Secrets in Committed Files

Claude MUST NEVER put any of the following into `docs/notes.md`, other documentation, examples, comments, test descriptions, or any other committed file:

* Real database URLs
* Credential-shaped database URLs (any `scheme://user:password@host/...` form, even if fake)
* API keys, tokens, passwords, private keys, or other secrets

Use obvious placeholders instead, such as `<DEV_DATABASE_URL>`, `<API_KEY>`, or `<TOKEN>`.

When reporting results or concerns, describe a value (for example, "a fake database URL") rather than reproducing it.

The repository's security tests enforce this. Never change or weaken them to make a failure pass; remove the offending content instead.

---

# 19. Product Development System

Detailed rules: `/docs/product-development.md`.

* `/docs/naming-conventions.md` is authoritative for naming. The user-facing product name is **Signal One Sound**; do not rename technical identifiers without a compatibility evaluation. Terms marked UNDECIDED must not be invented; ask Rich.
* `/docs/product/product-plan.md` is authoritative for product direction. Applicable specs under `/docs/features/` define approved feature behavior.
* Future product knowledge does NOT authorize implementation; only an approved issue does. One feature slice / issue / canonical branch / PR at a time; recommend the next slice, never start it.
* Repository-observed facts outrank external assumptions. Surface meaningful discrepancies (what was assumed, what exists, why it matters, recommended resolution); if material, stop and ask.
* Exploratory UI/features must be reviewed (Vercel Preview where applicable) before merge. Claude never merges.
* `docs/notes.md` is overwritten for the current work and must give exact current implementation visibility, including concrete manual-testing steps for Rich (`/docs/issues.md`).
* Material documentation drift is a defect; update docs in the same work.

---

# 20. Final Rule

Before implementing anything substantial, ask:

> **"Does this work as part of the Signal One platform, or does it only work for the feature/client I am currently looking at?"**

Signal One must remain a coherent platform across:

**Web + Android + iPhone + API + Clerk + Neon + Drizzle + Vercel.**

When in doubt, consult:

`/docs/architecture-rules.md`

and the relevant `/docs/*.md` documentation before proceeding.
