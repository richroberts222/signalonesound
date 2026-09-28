# Web Application

## Location and stack

The Web application lives in `apps/web`.

* Next.js (App Router), React, TypeScript
* Tailwind CSS v4
* shadcn/ui (see `/docs/ui.md`)
* Deployed on Vercel

Clerk is integrated for Web authentication (see `/docs/auth.md`). Drizzle and Neon are not yet added to the Web app.

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
