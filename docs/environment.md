# Environment and Configuration

One validated approach to configuration for Web, Mobile, database tooling, tests, GitHub Actions, Vercel, and Expo/EAS.

## Logical environments

`dev`, `qa`, `stage`, `prod` (`APP_ENVS`/`AppEnv` in `@signalone/shared`). `prod` is protected (`PROTECTED_APP_ENVS`). Environment identity is always explicit configuration, never inferred from hostnames (`/docs/database.md` section 2).

## Architecture

* `packages/shared/src/env.ts` holds all validation as pure functions over a plain record. It never reads `process.env`, so it runs in Node, browsers, and React Native.
  * `parseServerEnv(source)`: full server config.
  * `parseDatabaseEnv(source)`: `DATABASE_ENV` + `DATABASE_URL` only, for tooling that needs no Clerk keys.
  * `parseClientEnv(source)`: client-safe values only.
  * `assertDestructiveAllowed(target, allowed, operation)`: guard for destructive tooling.
  * `EnvValidationError`: lists every problem by variable name; never includes values.
* `apps/web/lib/env/server.ts`: `getServerEnv()`, imports `server-only` (a client import fails the build). Lazy, so `next build` does not need runtime secrets.
* `apps/web/lib/env/client.ts`: `getClientEnv()`, explicit literal `process.env.NEXT_PUBLIC_*` reads (required for bundler inlining).
* `apps/web/db/env.ts`: `loadDatabaseEnv()` used by `db/index.ts`, `drizzle.config.ts`, and `scripts/db-check.ts`. Not `server-only` so Node tooling can use it.

Application code asks these helpers for the environment instead of comparing raw `process.env` values.

## Variables

| Variable | Scope | Notes |
| --- | --- | --- |
| `APP_ENV` | server | Optional; defaults to `DATABASE_ENV` |
| `DATABASE_ENV` | server | Required; environment `DATABASE_URL` targets |
| `DATABASE_URL` | server only | Neon connection string |
| `CLERK_SECRET_KEY` | server only | |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | client-safe | |
| `NEXT_PUBLIC_APP_ENV` | client-safe | Optional display hint; not authoritative |
| `VERCEL_ENV` | platform | Read for the Preview guard |

Rules: server-only values are never prefixed `NEXT_PUBLIC_`/`EXPO_PUBLIC_`; database credentials never reach browser or mobile code.

## APP_ENV vs DATABASE_ENV

Separate concepts. `APP_ENV` is the application/runtime environment; `DATABASE_ENV` is the environment `DATABASE_URL` targets. They should normally be equal. Validation rejects the unsafe mismatch (a non-prod application using the prod database, or a prod application using a non-prod database). `APP_ENV` defaults to `DATABASE_ENV` when unset. Neither is ever inferred from hostnames.

## Environment mapping

| Context | Environment |
| --- | --- |
| Local development | `dev` |
| Feature/PR Vercel Preview | `qa` |
| Final pre-production verification | `stage` (protected, not for ordinary previews) |
| Production | `prod` |

Future Expo/EAS build profiles `development`, `qa`, `staging`, `production` map to `dev`, `qa`, `stage`, `prod`.

## Production protections

Validation fails (throws) when:

* a variable is missing, blank, or not one of the four environments;
* `DATABASE_URL` is not a URL with a `postgres:`/`postgresql:` protocol (the value is never echoed);
* `APP_ENV` and `DATABASE_ENV` disagree about being `prod` (non-prod app on prod DB, or the reverse);
* `VERCEL_ENV` is set to anything other than `production` (Preview, `vercel dev`) and the app or database is `prod`;
* `VERCEL_ENV=preview` and either `APP_ENV` or `DATABASE_ENV` is not `qa` (Preview must be qa; deployment architecture in `/docs/deployment.md`);
* a live Clerk secret key (`sk_live_`) is used outside `prod`.

Code cannot detect a `DATABASE_URL` that points at the wrong Neon branch while `DATABASE_ENV` claims otherwise; Vercel Preview variables must be configured carefully.

Tooling uses `assertDestructiveAllowed`: unknown target is refused, protected environments are refused even if listed, and the target must be in the allowed set. `assertNotProd` is the lighter guard for non-destructive tooling. `drizzle-kit` allows `dev`/`qa`/`stage`; `db:check` allows `dev` only. Future reset/seed (not implemented) must use the same guard with an allow-list of `dev`/`qa`.

## Local configuration

Copy `apps/web/.env.example` to `apps/web/.env.local` (gitignored) and fill in dev values. `pnpm --filter web db:check` verifies Neon connectivity for `dev`.

## GitHub Actions

`claude.yml` sets `DATABASE_ENV: dev` and `DATABASE_URL` from the secret `NEON_DEV_DATABASE_URL`. Only dev credentials belong in Actions secrets used by automation; no prod credentials. Workflow files were not modified by this foundation (the GitHub App cannot edit them). Future qa automation should use a separate `NEON_QA_DATABASE_URL` secret with `DATABASE_ENV: qa`.

## Vercel

Set per Vercel environment (see `/docs/deployment.md`): `DATABASE_ENV`, `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and optionally `APP_ENV`. Production must set `DATABASE_ENV=prod` (and `APP_ENV=prod` if set); Preview must set `DATABASE_ENV=qa` (and `APP_ENV=qa` if set), otherwise validation fails on the first server request. Existing Vercel configuration works unchanged because `APP_ENV` is optional.

## Mobile (Expo)

Mobile uses `parseMobileClientEnv` (`packages/shared/src/env.ts`), fed by `apps/mobile/src/config/env.ts` from literal `EXPO_PUBLIC_*` reads: `EXPO_PUBLIC_APP_ENV` (required), `EXPO_PUBLIC_API_BASE_URL` (required; `https` outside `dev`), `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` (optional until Clerk integration; `pk_` only, `pk_live_` only in `prod`). Values are set per EAS build profile (`dev`/`qa`/`stage`/`prod`) or in `apps/mobile/.env.local` locally (template: `apps/mobile/.env.example`). `EXPO_PUBLIC_*` is embedded in the app bundle and is public. Mobile never receives `DATABASE_URL` or `CLERK_SECRET_KEY` and talks only to the API. See `/docs/mobile.md`.

## Testing

`pnpm test` runs Vitest in `packages/shared` (`src/env.test.ts`, validation and guards) and `apps/web` (`lib/env/boundary.test.ts`, static checks that server env/db modules are `server-only`, client modules read no secrets, and no raw secret reads occur outside `lib/env`). Tests use fake values only. A shared Vitest setup file clears `APP_ENV`, `DATABASE_ENV`, `DATABASE_URL`, and Clerk keys before each test so unit tests cannot reach Neon; see `/docs/testing.md`. `ci.yml` runs these without secrets.

## Decision: APP_ENV and DATABASE_ENV stay separate

Decided: `APP_ENV` (application/runtime environment) and `DATABASE_ENV` (database environment) intentionally remain separate concepts. Their separation is what allows unsafe mismatches to be detected. This is no longer an open question.

## Open follow-ups

* Existing Vercel Preview variables must be switched to `qa` values (not verifiable from code).
