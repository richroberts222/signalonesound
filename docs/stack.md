# Technology Stack and How It Fits Together

An orientation for developers and coding agents. The rules live in the linked documents; this file explains what each piece owns and how a request moves through them. Where this file and a rule document disagree, the rule document wins.

## Architecture at a glance

```text
 Web (Next.js + React)            Mobile (React Native + Expo)
        |                                   |
        |  server components/actions        |  HTTP, Authorization: Bearer <Clerk token>
        v                                   v
 +------------------------------------------------------------------+
 |  API boundary         apps/web/app/api/v1/...  (lib/api handler)  |
 |    1. Authentication   Clerk token/session verified server-side   |
 |    2. Validation       Zod schemas from packages/validation       |
 |    3. Authorization    lib/auth (Actor, ownership/role checks)    |
 |    4. Service layer    lib/services  (business rules, Result<T>)  |
 |    5. Data access      db/*  (repositories, the only DB callers)  |
 |    6. Drizzle ORM      db/schema.ts, db/client                    |
 +------------------------------------------------------------------+
        |
        v
 Neon PostgreSQL   (dev | qa | stage | prod, one database each)

 Shared by every client and the server:
   packages/shared      types, constants, Result<T>, error codes, env parsing
   packages/validation  Zod schemas and API contracts, createApiClient
```

Web, Android, and iPhone are clients of one backend. Clients never import Drizzle, never read `DATABASE_URL`, and never talk to Neon. Rules: `/docs/architecture-rules.md`.

## What each technology owns

| Technology | Role here | Where |
| --- | --- | --- |
| **TypeScript** | One language everywhere. Shared types make the API contract compile-time checked across web, mobile, and server. | all workspaces |
| **Next.js (App Router)** | Web UI, server rendering, and the HTTP API (`app/api`). Hosts server-only code. `proxy.ts` protects routes. | `apps/web` |
| **React** | Component model for the web UI (and, via React Native, for mobile). | `apps/web`, `apps/mobile` |
| **Tailwind CSS (v4)** | Utility styling for web; theme tokens are CSS variables in `app/globals.css`. | `apps/web` |
| **shadcn/ui** | Owned, copy-in component source (`components/ui`) built on Tailwind; customize it, do not wrap a library. `/docs/ui.md` | `apps/web/components` |
| **React Native + Expo** | Native Android and iPhone client. Expo provides config (`app.config.ts`), Metro bundling, and EAS builds. UI is independent of web. `/docs/mobile.md` | `apps/mobile` |
| **Clerk** | Owns identity: sign-up/sign-in, sessions, tokens. The database stores only the Clerk user id, never a copy of the profile. `/docs/auth.md` | `apps/web/lib/auth`, `proxy.ts` |
| **Neon (PostgreSQL)** | Hosts the data, one branch/database per environment. Owns storage, not business rules. `/docs/database.md` | external |
| **Drizzle ORM** | Typed schema and queries, plus SQL migration generation (`drizzle-kit generate`). Server-only. | `apps/web/db`, `drizzle/` |
| **Zod** | Runtime validation of untrusted input at the boundary and of environment variables. Types are inferred from schemas. | `packages/validation`, `packages/shared` |
| **Vitest** | Unit, integration, and acceptance test runner. | all workspaces |
| **Playwright** | Browser end-to-end tests of the web app (native Playwright, not a wrapper). | `apps/web/e2e`, `playwright.config.ts` |
| **Vercel** | Hosts the web app and API; Preview = QA, Production = PROD. `/docs/deployment.md` | external |
| **EAS (future)** | Builds and distributes mobile apps per profile. | `apps/mobile/eas.json` |
| **pnpm workspaces** | One monorepo, pinned pnpm version, `workspace:*` links between packages. | repo root |

## Layers and responsibilities

* **API boundary** (`apps/web/lib/api`, `app/api/v1`): a thin adapter. It authenticates, validates input with Zod, calls one service, and returns the shared `Result<T>` JSON envelope. No business rules, no queries. Versioned under `/api/v1`. `/docs/api.md`
* **Shared contracts** (`packages/shared`, `packages/validation`): the request/response shapes, error codes, and `Result<T>` that web, mobile, and server all use, so behavior is defined once. Server-only code and secrets never live here. `/docs/shared-code.md`
* **Service / business layer** (`apps/web/lib/services`): authoritative rules, authorization decisions, transactions. Depends on data-access *interfaces*, so it is testable with fakes. `/docs/services.md`
* **Data-access layer** (`apps/web/db`): repositories are the only code that calls Drizzle. Everything below the services is server-only. `/docs/database.md`
* **Composition root** (`apps/web/lib/composition.ts`): the single place that wires real repositories into services.

## How web and mobile share backend behavior

Both call the same `/api/v1` endpoints through `createApiClient` (`packages/validation`), which parses responses with the same Zod contracts. Web server components may call services directly on the server, but through the same service layer, so a rule is implemented once. Mobile sends `Authorization: Bearer <Clerk token>`; web uses the Clerk session cookie. The server verifies either one.

## Authentication flow

1. The client signs in with Clerk (web: Clerk components at `/sign-in`, `/sign-up`; mobile: future Clerk Expo SDK).
2. Each API request carries the session/token. `proxy.ts` gates web pages; the API handler verifies identity again server-side.
3. The handler builds an `Actor` (today only the Clerk user id; roles arrive with the permissions model). Authorization (`lib/auth`) and the service decide what that actor may do. Client checks are convenience only.
4. Records that belong to a user store the Clerk user id.

## Environments

| Where it runs | `APP_ENV` / `DATABASE_ENV` | Database |
| --- | --- | --- |
| Local | `dev` | Neon DEV |
| Preview / feature PR | `qa` | Neon QA |
| Preproduction | `stage` | Neon STAGE |
| Production | `prod` | Neon PROD |

`APP_ENV` (what the app is) and `DATABASE_ENV` (what `DATABASE_URL` points at) are separate and a mismatch is refused. Validation fails closed: unset or unknown values are errors, a live Clerk key outside `prod` is refused, destructive tooling refuses `prod`. Details: `/docs/environment.md`.

## Migrations, reset, and seed

* Edit `apps/web/db/schema.ts`, run `pnpm --filter web db:generate`, review and commit the SQL in `apps/web/drizzle/`. A new app starts with an empty schema and no migrations; the first generate creates `0000_*`.
* `db:migrate` applies committed migrations (`dev`/`qa`/`stage`); `db:migrate:status` and `db:migrate:verify` report whether the database is exactly at the committed journal.
* `db:reset` and `db:seed` run only against `dev`/`qa`, require `--env` to match `DATABASE_ENV`, and keep the schema and migration history. Seeds are named and idempotent, recorded in a ledger schema.
* `drizzle-kit push` is not a deployment mechanism. Production migration is a reviewed human process. `/docs/database.md`

## Testing

| Kind | Purpose | Tooling |
| --- | --- | --- |
| Unit | Pure logic, validation, services with fakes; fast, no network | Vitest (`pnpm test:run`) |
| Integration | Real PostgreSQL behavior of repositories and migrations against DEV/QA; not in default CI | Vitest integration config |
| Acceptance | Behavior of a feature through the API using the shared acceptance suite pattern | Vitest |
| E2E | A user flow in a real browser, with a Clerk dev test user | Playwright |

The framework existing is not a reason to write tests: each new test passes the Test Value Review (`/docs/automation/test-value-review.md`). The template ships with only tests that protect the foundation (boundaries, env fail-closed behavior, security, error handling). `/docs/testing.md`, `/docs/automation/`

## CI and deployment

* `ci.yml` runs `pnpm validate` (lint, typecheck, unit tests, template tests, build) on pull requests with fake env values and no secrets. The `Protect main` ruleset requires the `Validate` check and a pull request; merging is the human's decision (see `/docs/git-workflow.md`).
* `claude.yml` runs the Claude workflow; the app cannot edit workflow files. Node is pinned once in `.node-version` (24, matching Vercel) and pnpm once in `packageManager`.
* Vercel builds `apps/web` from every pull request (Preview = QA) and deploys `main` to Production. A deployment succeeding does not prove architectural compatibility.
* Mobile: Expo/EAS profiles `development`, `qa`, `staging`, `production` map to `dev`, `qa`, `stage`, `prod`. Nothing is provisioned until a human runs `eas init`.

## Dependency and tooling compatibility

Versions of the framework, the tools and the runtime must work together. Rules:

1. **One runtime.** Node is pinned in `.node-version` (24, matching Vercel) and `engines`; pnpm only through `packageManager`. Type definitions for Node match the runtime major (`@types/node` ^24 in the web app).
2. **The Expo SDK owns the mobile versions** of `expo`, `react` and `react-native`. They change only together, through the SDK upgrade, and `expo install --check` must report up to date. Never bump `react-native` or `react` for the mobile app on their own (Dependabot's grouped proposal to move React Native ahead of the SDK is why).
3. **Unmet peer dependencies are defects.** `pnpm peers check` should be clean. The one documented exception today: the web app runs React 19.2.8 while Expo pins 19.2.3, which leaves one unmet React peer. Resolving it (one shared React version) is a recorded decision, not an accident.
4. **Major upgrades are deliberate issues.** Dependabot does not open automatic major-version pull requests for npm (`.github/dependabot.yml`). Before a major upgrade of a core tool (Next.js, Expo, Clerk, Drizzle and the Neon driver, Playwright, TypeScript, ESLint, Vitest), read its release notes and open issues for breaking changes and known problems, and record the result in the issue.
5. **Minor and patch updates are grouped and must pass `Validate`;** a failing update is held, not forced.
6. **Check regularly.** A weekly job running `pnpm peers check` and `expo install --check` is planned (`/docs/release.md`); until it exists, run both before every release and every upgrade.

Enforced today: Dependabot ignores npm majors, `Validate` runs on every update, the lockfile is frozen in CI. Not yet enforced: the peer and Expo checks are not in CI. Proof: the compatibility problems found in the audit (React Native 0.87 proposed against Expo 57, an outdated Node type package, an Expo patch behind) were found by these two commands and fixed.

## Development workflow

`CLAUDE.md` is the entry point. One issue = one canonical branch + one pull request; GitHub (issue, PR, diff, checks) is the live handoff and `docs/notes.md` is optional for non-discoverable information only (no secrets); independent issues may run in parallel when scopes do not overlap; a human merges. `/docs/issues.md`, `/docs/git-workflow.md`. `docs/ideas/` lists optional future ideas; nothing there is a requirement.

## Where identity and external projects are configured

See `/docs/customization-map.md` and `/docs/new-app-setup.md`.
