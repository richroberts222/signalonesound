# Testing

## Status

Vitest is the unit-test runner for every workspace that has tests (`packages/shared`, `packages/validation`, `apps/web`). It satisfies current needs; no other test tooling has been added. Categories that cannot yet be exercised (database-backed, API, component/E2E, mobile) are documented below, not faked.

## Philosophy and detailed rules

This document is the high-level testing philosophy: tests protect the whole platform, verify behavior rather than implementation, are deterministic, and respect environment safety. Detailed per-layer rules live in `/docs/automation/` (`test-value-review.md` (every new test or test group is justified before it is added), `unit.md`, `integration.md`, `acceptance.md`, `e2e.md`, `playwright.md`, `coverage.md`, `reporting.md`).

Every feature has explicit acceptance criteria, tests derived where the Test Value Review justifies them, and an honest completion report (`/docs/automation/README.md`).<!-- boilerplate:reference:start --> Product-feature delivery, layer selection, manual exploratory testing, and Definition of Done are in `/docs/product-development.md`;<!-- boilerplate:reference:end --> no feature automatically requires every layer. Playwright is the preferred E2E framework but is not installed yet. Code coverage is a diagnostic signal; 100% is not required.

Possible future quality capabilities (analytics, session replay, observability, usage-informed test prioritization) are in `/docs/ideas/`. They are NOT current requirements and must not be implemented without an explicit issue.

## Commands

Run from the repository root:

| Command | Purpose |
| --- | --- |
| `pnpm test` / `pnpm test:run` | Run every workspace's tests once (`vitest run`). What CI runs. |
| `pnpm test:watch` | Watch mode across workspaces. |
| `pnpm lint` / `pnpm typecheck` / `pnpm build` | Other required checks. |
| `pnpm validate` | `lint`, `typecheck`, `test:run`, `test:boilerplate`, `build` in order; the full local gate. |
| `pnpm --filter <name> test` / `test:watch` | One workspace (`web`, `@signalone/shared`, `@signalone/validation`). |

Every workspace with tests defines `test` (`vitest run`) and `test:watch` (`vitest`). Root scripts use `pnpm -r --if-present`, so new workspaces are picked up automatically once they define these scripts.

Report results in the pull request. If a check fails, say so; do not claim success.

## Organization and conventions

* Tests live next to the code they cover, named `*.test.ts(x)`. A workspace-level `tests/` directory is for cross-module tests only.
* Each workspace has its own `vitest.config.*` (explicit `include`, shared setup file, `unstubEnvs`).
* Tests are deterministic and isolated: no reliance on test order, wall-clock time, randomness, network, or real accounts unless controlled (use `vi.useFakeTimers`, `vi.stubEnv`, injected sources).
* Assert behavior (outputs, errors, boundaries), not that code ran. Every bug fix adds a regression test where practical.
* Prefer passing an explicit env source (`parseServerEnv(fakeServerEnv({...}))`) over mutating `process.env`; when mutation is needed use `vi.stubEnv` (auto-restored).

## Test categories

| Category | Where | Status |
| --- | --- | --- |
| Unit (pure functions) | `packages/shared/src/*.test.ts` | Implemented |
| Validation (Zod schemas: valid, invalid, boundary) | `packages/validation/src/*.test.ts` | Implemented |
| Shared env/config guards | `packages/shared/src/env.test.ts` | Implemented |
| Test-helper self-tests | `packages/shared/src/testing/testing.test.ts` | Implemented |
| Web static/boundary checks | `apps/web/lib/env/boundary.test.ts` | Implemented |
| Web server-side unit tests (server modules, with fakes) | `apps/web/**/*.test.ts` | Runner ready (node environment); add with features |
| Web component tests | `apps/web` | Not yet set up. Needs a DOM environment and Testing Library; add when the first interactive component warrants it (document the decision). |
| API / Server Action tests | `apps/web` | Future (see API foundation). Cover unauthenticated, unauthorized, invalid-input, success. |
| Database-backed integration | `apps/web` (or a db package) | Future (see below). |
| End-to-end | TBD | Future; critical flows (sign-in, protected routes). Playwright is the preferred framework (`/docs/automation/playwright.md`); not yet installed. |
| Mobile config/boundary (pure TypeScript) | `apps/mobile/src/*.test.ts` | Implemented (Vitest) |
| Mobile component/device | `apps/mobile` | Future (see below). |

## Test helpers

`@signalone/shared/testing` (`packages/shared/src/testing/`) is a test-only subpath export; it is NOT exported from the package index and must never be imported by application code.

* `setup.ts`: Vitest setup file used by all workspaces. Before every test it deletes `APP_ENV`, `DATABASE_ENV`, `DATABASE_URL`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `VERCEL_ENV` from `process.env`, and unstubs env after each test. A developer's shell or `.env` values therefore cannot leak into unit tests.
* `fakeServerEnv(overrides)`: a valid fake `dev` env source with an unroutable `.invalid` database host and placeholder keys.
* `clearIsolatedEnv`, `ISOLATED_ENV_NAMES`, `processEnv`: building blocks for the above.

Add a helper only when at least two tests need it.

## Environment safety

* Unit tests run with no DB credentials and no environment identity (enforced by `setup.ts`), so they cannot connect to Neon. `APP_ENV` and `DATABASE_ENV` remain separate concepts (`/docs/environment.md`); tests set them explicitly where they matter.
* No test may read or write `prod`, and no real secrets live in source control. Production/environment guards (`assertNotProd`, `assertDestructiveAllowed`, the prod/preview/live-key checks) must not be weakened or bypassed for tests; test them instead.
* Authentication in tests uses a faked auth boundary or Clerk development/test instances, never production users.

## Database-backed integration tests and E2E (implemented, Issue 49)

* `pnpm --filter web test:integration` runs `*.integration.test.ts` with `vitest.integration.config.mts` (it loads `apps/web/.env.local` but not the env-clearing setup). Tests refuse unless `DATABASE_ENV` is `dev`/`qa` (via `assertDestructiveAllowed`), `APP_ENV` matches, and Vercel is unset. Migrations must be applied first (`db:migrate -- --env=dev`). Test data must use unique owner ids and be removed afterwards.
* `pnpm --filter web test:e2e` runs Playwright (`/docs/automation/playwright.md`).<!-- boilerplate:proof:start -->
* The acceptance criteria of the proof feature (AC1 to AC9, listed in `lib/api/proof-items.acceptance-suite.ts`) run in memory in `pnpm test` and against the real database in the integration run.<!-- boilerplate:proof:end -->
* Neither command is in `pnpm test`/`validate`, and neither runs in CI yet (the secret-free `validate` job is unchanged; a separate job with a dev/qa secret is a human workflow change).

Original requirements, still binding for any new database-backed tests:

* live in a separate category/command (for example `test:integration`) that is NOT part of `pnpm test`/`validate` by default;
* set `DATABASE_ENV` explicitly to `dev` or `qa` and go through `assertDestructiveAllowed` with an allow-list of `dev`/`qa`; refuse when unset or `prod`/`stage`;
* start from a known state via the reset/seed process in `/docs/database.md` section 12, never destroying migration history;
* run in CI only in a separate job using a dedicated qa secret (`NEON_QA_DATABASE_URL`), never in the secret-free unit job.

## Mobile tests

`apps/mobile` runs Vitest for pure TypeScript only (env parsing and static boundary checks); it is included in `pnpm test`. React Native component and device tests are not set up. Future mobile tests run in their own workspace with the React Native/Expo runner appropriate to that scaffold (decide then; Vitest may not fit), must exercise the same API contracts as Web, and reuse `@signalone/shared` and `@signalone/validation` tests for shared logic rather than duplicating them. Mobile never receives `DATABASE_URL` or `CLERK_SECRET_KEY`.

## CI

`.github/workflows/ci.yml` (separate from `claude.yml`) runs on pull requests and pushes to `main`:

* `validate` job (the only job): `pnpm install --frozen-lockfile`, then `pnpm validate` (lint, typecheck, test:run, test:boilerplate, build). Read-only `contents` permission, no secrets, no database credentials. Build succeeds without credentials; keep it that way.
* **Planned, not built:** a `workflow-lint` job running [actionlint](https://github.com/rhysd/actionlint) (pinned version, standalone binary) over `.github/workflows/` to catch malformed workflow files. Workflow-file edits are made by the human.

Because the GitHub App cannot edit workflow files, changes to `ci.yml` are made or approved by the human. Local `pnpm validate` runs the same commands as CI.

## Expectations by layer

| Layer | Expectation |
| --- | --- |
| Shared packages | Unit tests for pure functions and Zod schemas (valid, invalid, boundary inputs). No mocks needed. |
| Business/service layer | Unit tests with data-access helpers faked; cover authorization failures and validation failures, not just success. |
| Data access | Integration tests against a non-production Neon branch (`qa`), never `prod`. |
| API / Server Actions | Tests for unauthenticated, unauthorized, invalid-input, and success paths. |
| Web UI | Component tests for behavior; end-to-end tests for critical flows (sign-in, protected routes). |
| Mobile | Must exercise the same API contracts as Web. |

## Expectations for new features

* New shared logic or schema ships with tests in the same PR (valid, invalid, boundary) where the Test Value Review (`/docs/automation/test-value-review.md`) finds them valuable. Do not add tests solely for documentation-only changes.
* New server logic ships with tests using fakes; new env variables extend the env tests.
* Run `pnpm validate` before pushing and report exact results; never claim CI passed unless it ran on GitHub.
* Do not add a test category's tooling until a real test needs it; document it here instead.
