# Notes: Issue 38 "Build Reusable Business and Service Layer Foundation"

1. Issue: #38 "Build Reusable Business and Service Layer Foundation"
2. PR: none yet at time of writing (open one from this branch; further @claude requests should come from that PR).
3. Canonical branch: `claude/issue-38-20261001-1233`, base `main` (`6ed0608`). Not merged.
4. Latest commit: the commit containing this file; see `git log -1` on the branch.

## 5. Work completed

- Added `apps/web/lib/services/` (framework-free service-layer foundation):
  - `context.ts`: `ServiceContext` (`{ actor }`), `createServiceContext(userId)`.
  - `errors.ts`: `ServiceError`, `notFound()`, `conflict()`, `validationFailed()`.
  - `run.ts`: `toAppError()`, `runService()` mapping thrown failures to the shared `Result<T>`/`AppError`.
  - `atomic.ts`: `AtomicRunner` + `createAtomicRunner(db)` wrapping `db.batch` with `withDbErrors`.
  - `index.ts` barrel; `services.test.ts` (generic placeholder "Item" example with fakes, error mapping, atomic runner, static boundary checks).
- Added `docs/services.md` (where logic belongs, conventions, transactions, web/API/mobile consumption, testing, undecided items); cross-references in `docs/web.md` and `docs/auth.md`.

## 6. Files changed

`apps/web/lib/services/{context,errors,run,atomic,index}.ts`, `apps/web/lib/services/services.test.ts`, `docs/services.md`, `docs/web.md`, `docs/auth.md`, `docs/notes.md`.

No database, schema, migration, reset/seed, auth, API, workflow, or root `package.json` changes.

- Services are plain functions/factories taking `(ctx: ServiceContext, input)`; identity only from `ctx`, never input. No FormData/Request/Next/React/Clerk/Drizzle-client imports in service code (type-only `Database` import allowed; enforced by test).
- Dependencies injected via factory arguments (data-access, `AtomicRunner`, clock/ID). No DI framework.
- Errors: expected failures throw `ServiceError`/`ForbiddenError`; `runService()` converts to shared `Result`. `DatabaseError` `unique_violation` maps to `conflict`; everything else to generic `internal`. Original error goes only to an optional `onUnexpected` hook (no logging foundation exists to integrate).
- Transactions: because `neon-http` has no interactive transactions, atomic work is a `db.batch` supplied as an injected `AtomicRunner`; consistent with `docs/database.md` section 18. Read-then-write transactions remain an undecided driver question.
- No new dependencies, no root/shared package changes, no API routes, no DB/seed/reset or mobile changes, no domain features.

## 8. Functional verification performed

Unit tests (fakes): success, validation failure with field errors, not found, forbidden for non-owner, ownership derived from context, statements run through the atomic runner once, DB errors not leaked, `toAppError` mappings, `createAtomicRunner` batch call and `DatabaseError` wrapping, static import/boundary checks.

## 9. Test/lint/typecheck/build results (latest run)

`pnpm` is not on PATH; `corepack pnpm install --frozen-lockfile` succeeded and package-level commands were run instead (root `pnpm validate` was not run):

- `npx vitest run` in `apps/web`: 5 files; 56 passed, **2 failed** (both in `lib/security.test.ts`, see concern 1). All new `services.test.ts` tests pass.
- `npx vitest run` in `packages/shared`: 3 files, 31 passed.
- `npx vitest run` in `packages/validation`: 1 file, 8 passed.
- `npx eslint` in `apps/web`: clean.
- `npx next typegen && npx tsc --noEmit` in `apps/web`: no errors. `tsc --noEmit` in `packages/shared` and `packages/validation`: no errors.
- `npx next build` in `apps/web`: succeeded, 5 routes.

## 10. Not tested, and why

- Database-backed behavior of `createAtomicRunner` against real Neon (no DB integration test tooling exists; only a fake `batch`).
- Real Clerk, API routes, and mobile consumption (none exist in scope).

## 11. Unresolved concerns

1. **Failing tests not caused by this change:** `lib/security.test.ts` flags `packages/shared/src/testing/index.ts` (it reads `process.env` via `globalThis` and contains the fake URL `postgresql://test:fake-password@db.invalid/test`). This file is untouched here; it appears to be an interaction between the testing-foundation and security-foundation merges. I did not modify it. CI `pnpm test:run` will fail until it is resolved. I did not run the suite on a clean `main` checkout to confirm, but the files named are not changed by this branch.
2. No composition root or logging wiring yet; `onUnexpected` is the integration point.
3. `AtomicRunner` batch statement type is derived from Drizzle's `batch` signature and tested only with fakes.

## 12. Recommended next steps

1. Resolve the pre-existing `security.test.ts` failures (separate fix).
2. Open the PR and review.
3. Build the first real domain service on these conventions together with its data-access helpers, and add an API route convention in `docs/api.md`.
