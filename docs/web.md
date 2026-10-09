# Web Application

## Location and stack

The Web application lives in `apps/web`.

* Next.js (App Router), React, TypeScript
* Tailwind CSS v4
* shadcn/ui (see `/docs/ui.md`)
* Deployed on Vercel

Clerk is integrated in the Web app (see `/docs/auth.md`). Drizzle ORM and the Neon serverless driver are installed; the server-only connection lives in `apps/web/db` and no product tables are defined yet<!-- boilerplate:proof:start --> (the only tables are the generic demo ones, `migration_proof` and `proof_item`)<!-- boilerplate:proof:end --> (see `/docs/database.md`).

Shared packages (`packages/shared`, `packages/validation`) are consumed as TypeScript source and are listed in `transpilePackages` in `next.config.ts`; add any new shared package there at its first import (see `/docs/shared-code.md`).

## Service layer

Business rules live in `apps/web/lib/services/` conventions (typed inputs, `ServiceContext`, `runService()` result mapping, injected data access and atomic runner), not in components, route handlers, or Server Actions. See `/docs/services.md`.

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

Database migration commands (Drizzle Kit). They read `DATABASE_ENV` (`dev|qa|stage|prod`) and `DATABASE_URL` from `apps/web/.env.local` (template: `apps/web/.env.example`) and refuse `prod`. Reset and seed commands are in `/docs/database.md` section 12.2. Confirm the target environment before running `db:migrate`.

```text
pnpm --filter web db:generate --name=<slug>      # drizzle-kit generate (SQL migrations to apps/web/drizzle; no database access)
pnpm --filter web db:migrate --env=dev|qa|stage # apply committed migrations (guarded; --env is mandatory; refuses prod)
pnpm --filter web db:migrate:status --env=...   # read-only: applied vs pending
pnpm --filter web db:migrate:verify --env=...   # read-only: nothing pending, no unknown history
```

## Global App Shell and navigation (Issue 68, experimental)

* `components/shell/app-shell.tsx` wraps every page from `app/layout.tsx`. Pages must not render their own global navigation or wordmark.
* `lib/navigation/nav-config.ts` is the single list of global destinations (Home, Discover, Dashboard when signed in). `components/shell/app-header.tsx` is one renderer of that list (header on `sm` and up, disclosure menu below). A different pattern (sidebar, bottom tabs) replaces the renderer, not pages.
* The wordmark is `components/brand/brand-wordmark.tsx`, linked to `/` by the header.
* This navigation is experimental and not approved as permanent. "Saved" is intentionally absent until a saved-events destination exists. Church/ministry/admin navigation is out of scope.

## Church/Ministry event-management mock (Issue 70, experimental)

* Routes under `/dashboard/church` (protected by the existing Clerk proxy, re-verified in `app/dashboard/church/layout.tsx`): dashboard, `events/new` (also `?replace=<id>`), `events/[eventId]` (manage), `events/[eventId]/edit`. Reached from a card on `/dashboard`.
* Mock only: `lib/church/mock-data.ts` is fictional static data; `lib/church/types.ts` shapes are mock-stage, not a schema or API contract. There is no persistence, API, or database access; the mock result screens say so.
* `lib/church/event-draft.ts` holds the startup form rules (required fields, 1-3 links, multiple Revival Types). Real submission must enforce these on the server, shared with all clients.
* Flyer, livestream, Speaker(s), and recurrence setup are shown only as a "Not part of this mock" list.
* Client/server boundary guard (`components/discover/server-boundary.test.ts`) now covers `components/church` too; add new feature component folders to its `FEATURE_DIRS`.
