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

## Production protections

Validation fails (throws) when:

* a variable is missing, blank, or not one of the four environments;
* `APP_ENV` and `DATABASE_ENV` disagree about being `prod` (non-prod app on prod DB, or the reverse);
* `VERCEL_ENV=preview` is combined with `prod`.

Tooling uses `assertDestructiveAllowed`: unknown target is refused, protected environments are refused even if listed, and the target must be in the allowed set. `drizzle-kit` allows `dev`/`qa`/`stage`; `db:check` allows `dev` only. Future reset/seed (not implemented) must use the same guard with an allow-list of `dev`/`qa`.

## Local configuration

Copy `apps/web/.env.example` to `apps/web/.env.local` (gitignored) and fill in dev values. `pnpm --filter web db:check` verifies Neon connectivity for `dev`.

## GitHub Actions

`claude.yml` sets `DATABASE_ENV: dev` and `DATABASE_URL` from the secret `NEON_DEV_DATABASE_URL`. Only dev credentials belong in Actions secrets used by automation; no prod credentials. Workflow files were not modified by this foundation (the GitHub App cannot edit them). Future qa automation should use a separate `NEON_QA_DATABASE_URL` secret with `DATABASE_ENV: qa`.

## Vercel

Set per Vercel environment (see `/docs/deployment.md`): `DATABASE_ENV`, `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and optionally `APP_ENV`. Production must set `DATABASE_ENV=prod` (and `APP_ENV=prod` if set); Preview must not. Existing Vercel configuration works unchanged because `APP_ENV` is optional.

## Future Expo/EAS (not built)

Mobile uses the same `parseClientEnv` shape, fed from `EXPO_PUBLIC_*` variables (Clerk publishable key, API base URL, optional app env) set per EAS build profile (`dev`/`qa`/`stage`/`prod`). `EXPO_PUBLIC_*` is embedded in the app bundle and is public. Mobile never receives `DATABASE_URL` or `CLERK_SECRET_KEY` and talks only to the API. A mobile API-base-URL field will be added to the client schema when Expo is scaffolded.

## Testing

`pnpm test` runs Vitest in `packages/shared` (`src/env.test.ts`). Tests use fake values only.
