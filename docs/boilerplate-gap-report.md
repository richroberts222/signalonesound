# Boilerplate Gap Report

Status as of the Phase 1 foundation work (issue #17).

## Complete

* Monorepo (pnpm workspaces), pinned pnpm, root `lint`/`typecheck`/`build` scripts (typecheck now covers packages)
* Web app: Next.js 16 App Router, Tailwind v4, shadcn/ui, Clerk sign-in/up, protected route via `proxy.ts`
* Database foundation: Neon + Drizzle wired server-only (`apps/web/db`), explicit `DATABASE_ENV`, prod-refusing Drizzle Kit config, read-only `db:check`
* Extensive rules: architecture, auth, database, data fetching, data mutations, git workflow, UI
* Phase 1 additions: `@signalone/shared`, `@signalone/validation`, README setup guide, `testing.md`, `security.md`, expanded `deployment.md`, `mobile.md`, `shared-code.md`

## Database foundation review

Current setup: `db/env.ts` validates `DATABASE_ENV`; `db/index.ts` (server-only) creates the Drizzle client over `neon-http`; `db/schema.ts` is empty; `drizzle.config.ts` writes migrations to `apps/web/drizzle` and refuses `prod`. No migrations exist.

Migration workflow (documented in `database.md` section 10): edit schema -> `db:generate` -> review SQL -> commit -> `db:migrate` against `dev`/`qa`/`stage`; `prod` only via a deliberate, separate process that is **not yet defined**.

Reset/seed strategy (`database.md` section 12) is documented but has no tooling.

Missing universal database helpers:

* Transaction helper (`neon-http` does not support interactive transactions; decide on `neon-serverless` Pool/WebSocket or `db.batch`)
* Reset and seed scripts (dev/qa only, prod-refusing, preserve migration history)
* Standard column helpers (id, `createdAt`/`updatedAt`, soft delete if desired)
* Clerk-user-ID ownership column convention and a current-user helper
* `db:check` variants for qa/stage; migration status command
* Production migration procedure

## Missing

* `docs/api.md`, `docs/routing.md`, `docs/server-components.md` are empty (intentionally undefined, not assumed)
* Test runner and any tests; CI for lint/typecheck/build
* API layer conventions: route handler wrapper (auth + validation + error mapping), error-to-HTTP mapping, API versioning
* Authorization helpers (distinct from authentication) and a current-user/session helper
* Logging/observability, rate limiting, security headers
* Web app consuming the shared packages (`transpilePackages` not yet configured as nothing imports them)
* Env validation module (typed, fail-fast) for non-database variables
* Mobile: Expo not scaffolded
* Boilerplate configuration: app name/branding are hard-coded (see `boilerplate-references-report.md`)
* Generator/init script to customize a fresh clone

## Recommended next phases

1. **CI + tests**: GitHub Action for lint/typecheck/build; choose Vitest; unit tests for `shared` and `validation`.
2. **App config**: single config module (name, description, identifiers) and convert hard-coded branding per the references report.
3. **API foundation**: route handler wrapper, `Result` -> HTTP mapping, define `docs/api.md`, current-user and authorization helpers.
4. **Database helpers**: transaction decision, column helpers, reset/seed tooling, production migration process. First migration only with explicit approval.
5. **Typed env validation** and security headers.
6. **Mobile scaffold** per `mobile.md` checklist.
7. **Boilerplate init script** and rename pass (requires explicit approval).

## Architectural concerns

* `neon-http` and transactions: `data-mutations.md` requires transactions for multi-step changes, which the current driver choice cannot provide interactively. Needs a decision before the first mutation feature.
* `APP_ENVS` is now defined once in shared; `apps/web/db/env.ts` was removed in favor of `apps/web/lib/env` (`/docs/environments.md`).
* Package scope `@signalone/*` embeds the application name (see references report).
* `README.md` previously contained only placeholder text; existing docs referenced commands that are unchanged.
