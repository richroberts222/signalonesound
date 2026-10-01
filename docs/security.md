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

## Gaps (not yet implemented)

Rate limiting, security headers/CSP, audit logging, and dependency scanning are not configured. See `/docs/boilerplate-gap-report.md`.
