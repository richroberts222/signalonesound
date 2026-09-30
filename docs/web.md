# Web Application

## Location and stack

The Web application lives in `apps/web`.

* Next.js (App Router), React, TypeScript
* Tailwind CSS v4
* shadcn/ui (see `/docs/ui.md`)
* Deployed on Vercel

Clerk is integrated in the Web app (see `/docs/auth.md`). Drizzle ORM and the Neon serverless driver are installed; the server-only connection lives in `apps/web/db` and no tables are defined yet (see `/docs/database.md`).

## Agent instructions

Next.js 16's automatic `AGENTS.md`/`CLAUDE.md` generation (`next dev`) is intentionally disabled via `agentRules: false` in `apps/web/next.config.ts`. Those files are not authoritative for this project: the root `CLAUDE.md` and `/docs` are the sole source of project guidance. `apps/web/AGENTS.md` and `apps/web/CLAUDE.md` are gitignored as a safety net in case this is ever re-enabled.

## Commands

Run from the repository root:

```text
pnpm dev        # start the web dev server
pnpm lint       # eslint
pnpm typecheck  # next typegen && tsc --noEmit
pnpm build      # next build
```

Database migration commands (Drizzle Kit). They read `DATABASE_ENV` (`dev|qa|stage|prod`) and `DATABASE_URL` from `apps/web/.env.local` (template: `apps/web/.env.example`) and refuse `prod`. Confirm the target environment before running `db:migrate`.

```text
pnpm --filter web db:generate  # drizzle-kit generate (SQL migrations to apps/web/drizzle)
pnpm --filter web db:migrate   # drizzle-kit migrate (applies committed migrations)
```
