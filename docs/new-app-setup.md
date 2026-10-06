# New Application Setup (External Services and First Steps)

What a human must do after the application has been initialized from the boilerplate. Nothing here is provisioned automatically: external accounts, projects, and credentials are created by a person. Rules live in the linked documents; this file is the ordered checklist and the "where does each value go" map.

Placeholders only: never commit real database URLs, credential-shaped URLs, Clerk keys, tokens, or passwords, and never write them in `docs/notes.md` (`/CLAUDE.md` section 18).

Related: `/docs/customization-map.md` (every naming/identity location and whether it is automatic, manual, secret, or environment-specific) and `/docs/stack.md` (how the stack fits together).

## 1. Local verification (no external services)

```text
corepack enable
pnpm install
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build
```

All four pass with no environment variables and no accounts. The new application has no database tables and no migrations until you design a schema.

## 2. Identity set at initialization

| Value | Where it lives |
| --- | --- |
| Display name | web metadata/header/home page, mobile `app.config.ts` `name`, docs |
| Slug | root `package.json` name, Expo `slug` and URL `scheme`, ledger schema name prefix in `db/tooling/seed.ts` |
| npm scope | `packages/*` names and imports, `apps/*` dependencies |
| Bundle id | `apps/mobile/app.config.ts`: `ios.bundleIdentifier` and `android.package` (same value; permanent once published to a store) |

## 3. Clerk (`/docs/auth.md`)

1. Create a Clerk application. Clerk identity stays in Clerk; do not copy user profile data into PostgreSQL. Tables reference the Clerk user ID only.
2. Use the **development** instance for local, QA/Preview, and Stage. Create a **production** instance only when you are ready to launch.
3. Web: set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (`pk_test_...`) and `CLERK_SECRET_KEY` (`sk_test_...`). Sign-in/sign-up routes exist at `/sign-in` and `/sign-up`; protected routes are matched in `apps/web/proxy.ts`.
4. Mobile: the shell has no Clerk SDK yet. Expectation: add `@clerk/expo`, send the Clerk token as a bearer token through `createApiClient`'s `getToken`; the API validates it server-side. Optional public key: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
5. A live key (`sk_live_`) outside `prod` is refused by validation.
6. For Playwright E2E, create a dedicated Clerk **development** test user (`E2E_CLERK_USER_USERNAME`, `E2E_CLERK_USER_PASSWORD` in `.env.local` or a CI secret).

## 4. Neon (`/docs/database.md`)

1. Create a Neon project with one branch per environment: `dev`, `qa`, `stage`, `prod`. `prod` is created last and its credential never leaves the production host/Vercel Production scope.
2. For each branch create a role that can reach only that branch's database; copy its connection string into the matching place in section 6.
3. Set `DATABASE_ENV` to the environment the URL targets. `APP_ENV` is separate; it normally equals `DATABASE_ENV`, and a mismatch is refused.
4. Lifecycle (all run from the repository root; `--env` must match `DATABASE_ENV`):

```text
pnpm --filter web db:generate                   # after editing apps/web/db/schema.ts; review and commit the SQL
pnpm --filter web db:migrate --env=dev          # apply committed migrations (dev | qa | stage; never prod)
pnpm --filter web db:migrate:status --env=dev
pnpm --filter web db:migrate:verify --env=dev   # fails if anything is pending or history is unknown
pnpm --filter web db:reset --env=dev            # dev | qa only; keeps schema and migration history
pnpm --filter web db:seed --env=dev             # dev | qa only
```

`drizzle-kit push` is never the deployment mechanism. Production migrations are a deliberate, reviewed human process (`/docs/database.md` section 10); the project does not automate them. Add the first domain table together with its migration, and add seeds to `SEEDS` in `apps/web/db/tooling/seed.ts` only for tables that exist.

## 5. Vercel (`/docs/deployment.md`)

1. Import the repository. Root Directory `apps/web`, framework Next.js, enable "Include source files outside of the Root Directory". Do not add `vercel.json` without a documented reason.
2. Set variables per scope (never use "All Environments" for secrets). Preview -> `qa` values, Production -> `prod` values, as in section 6.
3. Preview deployments are QA: `APP_ENV=qa`, `DATABASE_ENV=qa`, the qa Neon URL, Clerk development keys. A misconfiguration is caught on the first server request, not at build, so open a Preview after the first deployment.
4. Add your Vercel domains to the Clerk instance's allowed origins as needed.
5. Stage hosting (separate project or custom environment) is an open decision in `/docs/deployment.md` section 4.

## 6. Where each value belongs

| Value | Local dev | GitHub Actions | Vercel | Expo/EAS (future) |
| --- | --- | --- | --- | --- |
| `APP_ENV`, `DATABASE_ENV` | `apps/web/.env.local` (`dev`) | `claude.yml` env block (`dev`) | Preview `qa`, Production `prod` | `EXPO_PUBLIC_APP_ENV` per build profile in `eas.json` |
| `DATABASE_URL` | `.env.local` (dev branch) | secret `NEON_DEV_DATABASE_URL` (dev only; `claude.yml`) | per scope, own value each | never |
| `CLERK_SECRET_KEY` | `.env.local` (`sk_test_`) | only if a workflow needs it | per scope (test / live) | never |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local` | not needed by `ci.yml` | per scope | n/a |
| `EXPO_PUBLIC_API_BASE_URL` | `apps/mobile/.env.local` | n/a | n/a | `eas.json` `env` or EAS variables per profile (`https` outside dev) |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | `apps/mobile/.env.local` | n/a | n/a | EAS variables (public) |
| E2E test user | `.env.local` | secret, dev Clerk user only | never | never |

`ci.yml` needs no secrets: it runs `pnpm validate` against fake values. `claude.yml` needs the Claude token and, for database-backed work, the dev Neon secret; **no production credential belongs in GitHub Actions.**

## 8. Mobile / EAS (not provisioned by the boilerplate)

`apps/mobile/eas.json` defines `development`, `qa`, `staging`, `production` profiles mapped to `dev`, `qa`, `stage`, `prod`. To ship: create an Expo account/project, run `eas init` (adds the project id to your config), configure Apple and Google developer accounts and signing credentials, set per-profile `EXPO_PUBLIC_*` values, then `eas build`. The boilerplate has only verified Metro bundling (`pnpm --filter mobile export`), not a device run or an EAS build.

## 9. Claude / GitHub workflow

Inherited unchanged: `CLAUDE.md`, `docs/issues.md` (one issue = one canonical branch + PR, GitHub-first handoff; `docs/notes.md` optional), `docs/git-workflow.md`, `docs/automation/` including the Test Value Review. Add the Claude GitHub App and its OAuth/API secret in the new repository settings and enable branch protection requiring the `CI / Validate` check and a human merge. Workflow files are edited by a human (the Claude app cannot edit `.github/workflows`).

## 10. Growing the application

* Delete nothing from the reusable foundation. Add features through `contract -> route -> service -> data access -> schema/migration` as in `/docs/api.md` and `/docs/services.md`.
* Every new test passes the Test Value Review (`/docs/automation/test-value-review.md`). CI starts with lint, typecheck, unit tests, and build; add integration, acceptance, and Playwright jobs when a feature has behavior worth protecting and the secrets (dev Neon, Clerk dev test user) are provisioned.
* `docs/ideas/` stays a list of future ideas; nothing in it is a requirement.
