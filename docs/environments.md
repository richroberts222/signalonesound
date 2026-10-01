# Environments and Configuration

How Signal One identifies its environment and validates configuration. This builds on `/docs/architecture-rules.md` section 13 and 22 and `/docs/database.md` sections 2 to 4 and 14.

## Environments

| `APP_ENV` | Purpose | Database | Clerk keys |
| --- | --- | --- | --- |
| `dev` | Local development | Neon `dev` | development (`pk_test_`/`sk_test_`) |
| `qa` | Automated/integration testing | Neon `qa` | development |
| `stage` | Production-like pre-release validation | Neon `stage` | development unless a stage Clerk instance is created |
| `prod` | Real users and data | Neon production branch | production |

The list lives once, in `APP_ENVS` (`packages/shared/src/constants.ts`). The environment is **explicit configuration**: it is never inferred from a hostname, `NODE_ENV`, or a Neon endpoint.

## Code layout (`apps/web/lib/env/`)

| File | Role | Safe for client? |
| --- | --- | --- |
| `app-env.ts` | `AppEnv`, `resolveAppEnv`, `assertNotProd`, `assertDestructiveAllowed`, `EnvError` | yes (no secrets) |
| `server-schema.ts` | Pure validators `parseDatabaseEnv`, `parseServerEnv` | no (tooling/tests only) |
| `server.ts` | `getServerEnv()`, `getDatabaseEnv()`; imports `server-only` | **no**, build fails if reached from client code |
| `client.ts` | `getClientEnv()`: `NEXT_PUBLIC_*` values only | yes |

Rules:

* Application code reads configuration through these modules, not raw `process.env`. `env.test.ts` fails if secrets are read directly elsewhere in `app`, `components`, `db`, or `lib`.
* Tooling (`drizzle.config.ts`, `scripts/db-check.ts`) uses `parseDatabaseEnv`, which requires only `APP_ENV` and `DATABASE_URL`, not Clerk.
* Validation fails fast with a clear message and never echoes secret values.
* Add a new variable by extending the relevant parser, `.env.example`, and the table below.

## Variables

| Variable | Scope | Where set | Notes |
| --- | --- | --- | --- |
| `APP_ENV` | server | `.env.local`, Vercel, GitHub Actions | `dev|qa|stage|prod`. Legacy `DATABASE_ENV` is accepted if `APP_ENV` is unset; if both are set they must match. |
| `DATABASE_URL` | **server-only secret** | `.env.local`, Vercel, Actions secrets | Must be `postgres://` or `postgresql://`. Must match `APP_ENV`. |
| `CLERK_SECRET_KEY` | **server-only secret** | same | `sk_live_` rejected unless `APP_ENV=prod`. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | client-safe | same | Inlined into the browser bundle. |
| `VERCEL_ENV` | provided by Vercel | automatic | Used only as a safety cross-check. |

Never prefix a secret with `NEXT_PUBLIC_` (web) or `EXPO_PUBLIC_` (mobile): those are public.

## Production protections

* `resolveAppEnv` rejects `APP_ENV=prod` on a Vercel Preview/Development deployment (`VERCEL_ENV` other than `production`).
* `assertNotProd(env, op)`: used by `drizzle.config.ts`, so local drizzle-kit never runs against prod.
* `assertDestructiveAllowed(env, op)`: allow-list (`dev`, `qa`). **All future reset/seed/bulk-data tooling must call this first.** Unknown, missing, or invalid environments fail closed. Reset/seed are not implemented yet.
* `pnpm --filter web db:check` is read-only (`SELECT 1`) and limited to `dev`.

## Local configuration

```text
cp apps/web/.env.example apps/web/.env.local   # then fill in dev values
pnpm --filter web db:check
pnpm --filter web test
```

`.env.local` is gitignored. Use placeholders only in `.env.example`.

## Vercel

Set per Vercel environment (never commit values): `APP_ENV`, `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.

* Production: `APP_ENV=prod`, prod database, production Clerk instance.
* Preview: non-prod `APP_ENV` (`qa` or `stage`, decided per `/docs/database.md` section 15) and a non-prod `DATABASE_URL`. Preview must never use `prod`; the `VERCEL_ENV` check enforces this for `APP_ENV`, but a mis-set `DATABASE_URL` cannot be detected by code (the URL is not used to infer environment), so verify it in the Vercel dashboard.
* Existing deployments that only set `DATABASE_ENV` keep working; migrate them to `APP_ENV`.
* The build does not require these variables (all routes are dynamic); runtime does.

## GitHub Actions

Current workflows (`claude.yml`, `claude-code-review.yml`) use only `CLAUDE_CODE_OAUTH_TOKEN` and need no application configuration. When CI is added:

* Store `DATABASE_URL` and `CLERK_SECRET_KEY` for `qa` as Actions secrets (or environment-scoped secrets); never use prod credentials in CI.
* Set `APP_ENV=qa` explicitly in the workflow; unit tests (`pnpm --filter web test`) need no secrets.
* Do not print secrets or pass them to untrusted PR code (forks).

## Future Expo/EAS (not implemented)

* Mobile config is separate from web (`/docs/architecture-rules.md` section 13). Only public values go in `EXPO_PUBLIC_*`: Clerk publishable key, API base URL, and an app environment name.
* Mobile never receives `DATABASE_URL` or `CLERK_SECRET_KEY`; it calls the API (`/docs/mobile.md`).
* Use EAS build profiles (`development`, `qa`, `staging`, `production`) mapped to `dev`/`qa`/`stage`/`prod`, with variables per profile in EAS. EAS secrets are build-time and still end up in the bundle if `EXPO_PUBLIC_`.
* Reuse `APP_ENVS` from `@signalone/shared` and the pure helpers in `app-env.ts`; move them into a shared package at that time if mobile needs them.

## Verification

`apps/web/lib/env/env.test.ts` covers environment detection, invalid/missing values, production guards, URL and Clerk key validation, and static checks on the client/server boundary. Run with `pnpm --filter web test`.
