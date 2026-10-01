# Deployment

## Vercel

The Web application is deployed to Vercel.

* Vercel project Root Directory: `apps/web`
* Framework preset: Next.js
* Package manager: pnpm (detected from the root `pnpm-lock.yaml`)

Enable "Include source files outside of the Root Directory" in the Vercel project settings so the workspace lockfile and `packages/*` are available during the build.

## Environments

Logical environments are `dev`, `qa`, `stage`, and `prod` (`APP_ENVS` in `@signalone/shared`). Each maps to a persistent Neon branch (see `/docs/database.md` sections 2, 13, and 15).

| Vercel environment | Database target | Clerk instance |
| --- | --- | --- |
| Development (local) | `dev` | development |
| Preview | non-production (`qa`/`stage` as decided per project) | development |
| Production | `prod` | production |

Preview deployments must never point at `prod`.

## Environment variables

Set in Vercel per environment; never commit values. Required today: `DATABASE_ENV`, `DATABASE_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`. Only variables that must reach the browser use `NEXT_PUBLIC_`.

## Release flow

1. Pull request with passing `pnpm lint`, `pnpm typecheck`, `pnpm build`.
2. Review the Vercel preview.
3. Merge to `main` (production deploy).
4. Apply any migrations to `prod` through the deliberate process in `/docs/database.md` section 10, not from local tooling.

Migration ordering: migrations are applied before (or compatibly with) the code that needs them; schema changes must be backward compatible with the currently deployed code (expand, then contract).

## Mobile

Mobile release (EAS/app stores) is not yet defined. See `/docs/mobile.md`.

## CI

CI checks are not yet configured beyond the Claude workflows. Adding lint/typecheck/build CI is a recommended next step (`/docs/boilerplate-gap-report.md`).
