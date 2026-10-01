# Notes: Issue 23 "Build Reusable Database Helpers Foundation"

1. Issue: #23 "Build Reusable Database Helpers Foundation"
2. PR: none yet at time of writing (open one from this branch; further @claude requests should come from that PR).
3. Canonical branch: `claude/issue-23-20261001-0628`, base `main`. Not merged.
4. Latest commit: the commit containing this file (base was `5a0b76a`); see `git log -1` on the branch.

## 5. Work completed

- Split the DB layer in `apps/web/db`: `client.ts` (`createDb`, `Database` type), `index.ts` (server-only lazy cached `getDb()`; replaces the eager `db` export, which nothing imported), `errors.ts` (`DatabaseError`, `withDbErrors`, Postgres-code categorization, sanitized messages), `health.ts` (`checkDatabaseConnection`, read-only `SELECT 1`).
- `scripts/db-check.ts` now uses `createDb` + `checkDatabaseConnection` (still dev-only guard).
- Driver review: kept `neon-http`. Confirmed in drizzle source and a test that `db.transaction` throws; `db.batch` provides atomic non-interactive transactions. No driver change; no requirement for interactive transactions exists yet.
- Tests added: `db/db.test.ts` (error mapping, no leakage, health check with fake db, driver transaction limitation); extra static check in `lib/env/boundary.test.ts`.
- Docs: `docs/database.md` section 18 (driver decision, batch rule, layer layout) and section 23 (status).
- No domain schema, no migrations, no reset/seed, no API work.

## 6. Files changed

`apps/web/db/client.ts` (new), `db/errors.ts` (new), `db/health.ts` (new), `db/db.test.ts` (new), `db/index.ts`, `scripts/db-check.ts`, `lib/env/boundary.test.ts`, `docs/database.md`, `docs/notes.md`.

## 7. Architecture decisions

- Keep `neon-http`; use `db.batch` for atomic writes; moving to the WebSocket driver is a documented future decision if a read-then-write transaction is needed.
- `getDb()` is lazy so builds do not need secrets; `server-only` stays on `index.ts` only. `client.ts`/`errors.ts`/`health.ts` are not server-only so tooling and tests can use them; they hold no secrets.
- Errors: `DatabaseError` carries a category and keeps the raw error as `cause` only.
- No generic repository abstraction.
- `APP_ENV` and `DATABASE_ENV` remain separate; env loading unchanged.

## 8. Functional verification performed

- `db:check` (tsx `scripts/db-check.ts`) ran against Neon with `DATABASE_ENV=dev`: output "OK: connected to Neon (DATABASE_ENV=dev), SELECT 1 succeeded." It exercises `createDb` and `checkDatabaseConnection`. Read-only; no data written. The process environment already supplied the variables (dotenv injected 0 from `.env.local`); I did not inspect them.
- Client import prevention: `index.ts` keeps `import "server-only"`, asserted by the boundary test; `next build` succeeded.

## 9. Test/lint/typecheck/build results (latest run)

Run via `corepack pnpm exec ...` in each package, because the `pnpm` scripts spawn a bare `pnpm` that is not on PATH in this runner.
- `apps/web` vitest: 2 files, 17 tests passed.
- `packages/shared` vitest (existing env tests): 1 file, 22 tests passed.
- `next typegen` + `tsc --noEmit`: no output (no errors).
- `eslint`: no output (no problems).
- `next build`: succeeded (5 routes).
- `db:check` against dev: succeeded (above).

## 10. Not tested, and why

- `getDb()` itself is not unit-tested: it imports `server-only`, which throws under vitest. It is covered by typecheck, build, and a static test only.
- `db.batch` was not run against Neon: it would need a table, and no schema is allowed in this task.
- Real Postgres error codes (unique violation, etc.) were not triggered against a database; the mapping is tested with synthetic errors.
- Root `pnpm test|lint|typecheck` scripts were not run as written (PATH issue above).
- QA/STAGE/PROD were not touched.

## 11. Unresolved concerns

- The `DatabaseError` kind to application error mapping belongs to the future service layer.
- Driver choice should be revisited when the first feature needs read-then-write transactional logic.

## 12. Recommended next steps

1. Open the PR from this branch and review.
2. Next foundation tasks: reset/seed tooling (dev/qa only), then the API foundation.
3. Human merges when satisfied.
