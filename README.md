# Signal One

A pnpm monorepo: a Next.js web app (`apps/web`), an Expo mobile app foundation shell (`apps/mobile`), and shared packages (`packages/*`). Web, Android, and iPhone are clients of one backend. Project rules live in [`CLAUDE.md`](CLAUDE.md) and [`/docs`](docs).

## Prerequisites

* Node.js 20+
* Corepack (ships with Node) so the pinned pnpm version is used
* A [Clerk](https://clerk.com) account and a [Neon](https://neon.tech) account

## Setup

```text
git clone <repository-url>
cd <repository-directory>
corepack enable
pnpm install
```

### Environment variables

```text
cp apps/web/.env.example apps/web/.env.local
```

`.env.local` is gitignored. Never commit real values. Fill in:

| Variable | Purpose |
| --- | --- |
| `DATABASE_ENV` | Logical environment `DATABASE_URL` targets: `dev`, `qa`, `stage`, or `prod`. Use `dev` locally. |
| `DATABASE_URL` | Neon connection string for that environment. |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (client-safe). |
| `CLERK_SECRET_KEY` | Clerk secret key (server-only). |

See [`docs/auth.md`](docs/auth.md) and [`docs/database.md`](docs/database.md).

### Clerk

1. Create a Clerk application and use its **development** instance.
2. Copy the publishable and secret keys into `apps/web/.env.local`.
3. Sign-in and sign-up routes are already at `/sign-in` and `/sign-up`.

### Neon

1. Create a Neon project with a persistent `dev` branch (see [`docs/database.md`](docs/database.md) for the environment model).
2. Copy the `dev` branch connection string into `DATABASE_URL` and set `DATABASE_ENV=dev`.

## Run

```text
pnpm dev                        # web dev server on http://localhost:3000
pnpm --filter web db:check      # read-only Neon connectivity check (SELECT 1, dev only)
```

## Validation

```text
pnpm lint
pnpm typecheck
pnpm build
```

## Database commands

Run against `dev`/`qa`/`stage` only; Drizzle Kit refuses `prod`. Confirm `DATABASE_ENV` first.

```text
pnpm --filter web db:generate   # generate SQL migrations from apps/web/db/schema.ts
pnpm --filter web db:migrate    # apply committed migrations
```

No application tables exist yet. See [`docs/database.md`](docs/database.md) for the migration workflow.

## Development workflow

1. Create a branch from `main`; one work item per branch ([`docs/git-workflow.md`](docs/git-workflow.md)).
2. Read the relevant docs in `/docs` before changing code.
3. Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, and tests per [`docs/testing.md`](docs/testing.md).
4. Open a pull request; do not commit to `main`. Vercel builds a preview.

## Repository layout

```text
apps/web            Next.js (App Router) web app
apps/mobile         Expo app (foundation shell)
packages/shared     Shared types, constants, result/error shapes, pure utilities
packages/validation Shared Zod schemas
docs                Architecture and project rules (source of truth)
```

## Documentation index

[`architecture-rules`](docs/architecture-rules.md) · [`auth`](docs/auth.md) · [`database`](docs/database.md) · [`data-fetching`](docs/data-fetching.md) · [`data-mutations`](docs/data-mutations.md) · [`shared-code`](docs/shared-code.md) · [`security`](docs/security.md) · [`testing`](docs/testing.md) · [`deployment`](docs/deployment.md) · [`mobile`](docs/mobile.md) · [`web`](docs/web.md) · [`ui`](docs/ui.md) · [`git-workflow`](docs/git-workflow.md) · [`boilerplate-gap-report`](docs/boilerplate-gap-report.md) · [`boilerplate-references-report`](docs/boilerplate-references-report.md)
