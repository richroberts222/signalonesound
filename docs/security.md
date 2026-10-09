# Security

This document consolidates security rules; detailed rules live in `/docs/auth.md`, `/docs/database.md`, and `/docs/data-mutations.md`.

## Secrets and environment

* Secrets are never committed. `.env*` is gitignored except `.env.example`, which contains names and placeholders only.
* Server-only values (`DATABASE_URL`, `CLERK_SECRET_KEY`) must never be prefixed `NEXT_PUBLIC_`, imported into client components, or placed in shared packages.
* Environment validation and production guards are described in `/docs/environment.md`; read configuration through those helpers, not raw `process.env`.
* Server-only modules import `server-only` (as `apps/web/db/index.ts` does).
* Mobile bundles are public: never embed server secrets in Expo config or `EXPO_PUBLIC_*` variables.
* Never log secrets, tokens, or connection strings; report error messages only.
* Environment identity is explicit (`DATABASE_ENV`), never inferred from hostnames. Local tooling refuses `prod`.

## Authentication vs authorization

* Authentication (Clerk) establishes who the caller is; it is validated on the server for every protected route, Server Action, and API endpoint.
* Authorization decides whether that caller may perform this action on this resource. It is a separate server-side check in the business layer, on every request, and is never implied by being signed in.
* Hiding UI is not authorization. The client is never trusted to enforce access.
* Ownership checks use the authenticated Clerk user ID, never an ID supplied by the client.

## Trust boundaries

* Clients (Web, Android, iPhone) never access the database directly.
* All input crossing a boundary (request bodies, query/search params, FormData, headers) is validated with Zod on the server, even if the client also validates.
* Shared schemas live in `@signalone/validation`; client-side validation is a convenience only.

## Errors

* Return `Result`/`AppError` (`@signalone/shared`) for expected failures with safe messages.
* Unexpected errors are logged server-side and surfaced to clients as `internal` with a generic message. Never leak stack traces, SQL, or internals.
* Do not reveal whether a resource exists to callers not authorized to see it, where that matters (prefer `not_found`).

## Dependencies

* Add dependencies deliberately (see `CLAUDE.md` section 14). Commit the lockfile; install with the pinned pnpm.
* Review the dependency and supply-chain implications of any new package.

## Security foundation (Issue 26)

Permanent decisions established by the security foundation. Automated checks live in `apps/web/lib/security.test.ts` (static, source-text only) alongside `apps/web/lib/env/boundary.test.ts` and `packages/shared/src/env.test.ts`.

### Trust boundaries

```text
Browser / Android / iPhone  (untrusted, public bundles)
        |  HTTPS, Clerk session
        v
Next.js server / API        (trusted; validates auth, input, authorization)
        |  server-only credentials
        v
Drizzle -> Neon             (never reachable from clients)
```

Anything in a client bundle is public. Only the server is trusted to enforce rules.

### Secret handling

* Real secrets live only in Vercel/GitHub/EAS secret stores and gitignored `.env.local`; never in source, tests, docs, `.env.example`, logs, or error messages. Examples use placeholders (`USER:PASSWORD@HOST`, `sk_test_REPLACE_ME`).
* Validation errors name variables, never values (`EnvValidationError`).
* Test fixtures use obviously fake values.

### Public vs private configuration

* Only names prefixed `NEXT_PUBLIC_` / `EXPO_PUBLIC_` reach clients, and only values safe to publish (Clerk publishable key, display hints).
* `DATABASE_URL`, `CLERK_SECRET_KEY`, and any future credential are server-only. `NEXT_PUBLIC_DATABASE_URL` or any client-accessible database credential is forbidden. A public name containing `DATABASE`, `SECRET`, `PRIVATE`, `PASSWORD`, `TOKEN`, `CONNECTION`, `CREDENTIAL`, `API_KEY`, or `SERVICE_KEY` is rejected by test (in code and config; docs may name the forbidden pattern).
* `lib/env/client.ts` lists each public read explicitly; `next.config.ts` must not use the `env` option to forward values.

### Client/server boundaries

* `lib/env/server.ts` and `db/index.ts` import `server-only`. `db/env.ts`, `drizzle.config.ts`, and `scripts/` are Node tooling and must not be imported by client code.
* `'use client'` files must not import `server-only`, `@/db`, `lib/env/server`, `drizzle-orm`, `@neondatabase/*`, or `@clerk/nextjs/server`; shared packages must not read `process.env` or import server libraries. Enforced by test. New server-only modules must add `import "server-only"`.
* Limits: the check is textual and does not follow transitive imports; `server-only` itself is the build-time backstop.

### Authentication vs authorization

Authentication = who the user is (Clerk is the sole identity authority). Authorization = what that user may do (server-side, per request, per resource, in the business layer). `proxy.ts` route protection is authentication only and is not authorization. No application authorization rules exist yet; future domain work must add them in the service layer using the authenticated Clerk user ID.

### Production safety

`APP_ENV` and `DATABASE_ENV` stay separate and a prod/non-prod mismatch is rejected; Preview/non-production Vercel deployments cannot use `prod`; live Clerk keys are refused outside `prod`; destructive tooling fails closed and refuses protected environments (see `/docs/environment.md`). Guards must never be relaxed for convenience. Automation and local tooling never hold production credentials.

### Database credentials

Only the server holds a connection string, one per environment, matching `DATABASE_ENV`. Only dev credentials in Actions. Clients reach data only through the API. Least-privilege roles (separate migration and runtime users) are recommended but not configured.

### GitHub / CI expectations

* Least-privilege `permissions`; secrets scoped to the steps that need them; no production secrets in Actions.
* No merge, force-push, destructive reset, or branch-delete tooling (checked by test for workflow files).
* `main` is protected by the GitHub ruleset `Protect main` (active, no bypass actors): deletion and force-push are blocked, changes require a pull request (0 required approvals, since the sole owner cannot approve their own PR), and the `Validate` check from GitHub Actions must pass. "Require branches to be up to date" is off because open PRs are revalidated after each merge (`/docs/issues.md`). Changes to the ruleset are made by Rich in repository settings.
* Workflow files are changed only through a pull request that the owner reviews and merges (the GitHub App cannot edit them). The Claude workflow (`claude.yml`) is the only one with write permissions. Its state, enforced by `apps/web/lib/security.test.ts`:
  * No database credential in the job.
  * Exact command allow-list: no wildcard on `pnpm`, `npx`, `corepack` or `gh pr`, and no pull-request merge command.
  * Every `uses:` in every workflow is pinned to a full commit hash with a version comment. Dependabot (`.github/dependabot.yml`) proposes updates weekly.
  * `id-token: write` is kept: whether the action needs it with an OAuth token is untested (F-SEC-002 point 4); remove it only after a test run passes without it.
  * The automated review workflow (`claude-code-review.yml`) was removed: it produced no visible output (F-DEVOS-001, Q-008).

### API and mobile expectations

The API foundation (`/docs/api.md`) implements the authenticate, validate, authorize-in-service, safe-`Result` sequence below for `/api/v1`. Not yet in place: rate limiting, CORS, request logging.

* API endpoints and Server Actions: authenticate, validate input with Zod, authorize per resource, return safe `Result`/`AppError` failures, fail closed (deny on error/unknown). Never trust client-supplied user IDs, roles, or environment.
* Mobile: bundles are public; `EXPO_PUBLIC_*` only for publishable values; no secrets in Expo config; tokens in secure storage; mobile talks to the API only.
* Integration points (not implemented here): logging/error handling must apply the "never log secrets" rule; database helpers must use `loadDatabaseEnv` and the destructive guards; the testing foundation should keep these security tests in the default `pnpm test` run.

### Dependencies

`pnpm audit --prod` is not run in CI and its result changes over time. On 2026-10-09 it listed 5 advisories (4 high, 1 moderate): `node-forge` and `braces` (no patched version exists; transitive through Expo and shadcn tooling), `source-map-js` and `@modelcontextprotocol/sdk` (transitive development tooling), and one moderate. A high advisory in Next.js itself (server-side request forgery in image optimization) was fixed by updating to 16.3.8. Dependabot version updates are on; Dependabot alerts and security updates depend on a repository setting (owner action). Treat a high advisory in a runtime package as a stop-and-fix item; transitive items with no fix are recorded and revisited when a patch ships.

## Gaps (not yet implemented)
The standard that every change must meet, with data tiers, patch targets and the handling of known and unknown vulnerabilities, is `/docs/secure-coding.md`. Baseline response headers (anti-framing, nosniff, referrer and permissions policy, HTTPS) and lint rules against raw HTML injection are now in place and tested. Still open: a full script policy (CSP script-src, report-only first), rate limiting, audit logging, log redaction rules, cross-site request forgery review for Server Actions, and automated dependency and code scanning as merge gates (a weekly health workflow reports; code scanning is a repository setting).
