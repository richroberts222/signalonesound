# Notes: Issue 35 "Build Reusable Database Lifecycle, Reset, and Seed Foundation"

1. Issue: #35 "Build Reusable Database Lifecycle, Reset, and Seed Foundation"
2. PR: none yet at time of writing (open one from this branch; further @claude requests should come from that PR).
3. Canonical branch: `claude/issue-35-20261001-1228`, base `main` (`6ed0608`). Not merged.
4. Latest commit: the commit containing this file; see `git log -1` on the branch.

## 5. Work completed

- `apps/web/db/tooling/`: `guard.ts` (fail-closed `resolveToolingTarget`, `parseEnvFlag`), `executor.ts` (minimal `SqlExecutor` over `neon`), `reset.ts` (`resetData`), `seed.ts` (`Seed`, ledger, `runSeeds`, generic `tooling-smoke` seed), `cli.ts` (shared script entry), `tooling.test.ts` (13 tests).
- Scripts `scripts/db-reset.ts`, `db-seed.ts`, `db-refresh.ts` and package scripts `db:reset`, `db:seed`, `db:refresh` (all require `--env=dev|qa`).
- Docs: `docs/database.md` new sections 12.1 (lifecycle, schema vs data promotion) and 12.2 (tooling, guard, how to add seeds) plus status line; `docs/environment.md` guard paragraph; `docs/boilerplate-gap-report.md` line.
- Fixed a pre-existing failing test: `lib/security.test.ts` now treats `packages/shared/src/testing/` (fake fixtures from the shared test setup) as test code. Two of its scans failed on the first full run flagging only `packages/shared/src/testing/index.ts`, a file this issue did not modify; I did not run the suite on a clean `main` checkout to confirm the failure pre-dated my files.

## 6. Files changed

`apps/web/db/tooling/{guard,executor,reset,seed,cli}.ts`, `apps/web/db/tooling/tooling.test.ts`, `apps/web/scripts/db-{reset,seed,refresh}.ts`, `apps/web/package.json`, `apps/web/lib/security.test.ts`, `docs/{database,environment,boilerplate-gap-report,notes}.md`.

## 7. Architecture decisions

- Allow-list `dev`, `qa` only; `stage` and `prod` are always refused. Reuses `parseDatabaseEnv` and `assertDestructiveAllowed`.
- Additional guards: `APP_ENV` (if set) must equal `DATABASE_ENV`; `VERCEL_ENV` must be unset; explicit `--env` must match `DATABASE_ENV`. Safety is never inferred from `DATABASE_URL`.
- Reset truncates `public` tables and the tooling ledger only; never drops, never touches the `drizzle` schema (migration history).
- Seeds are tracked in `signalone_tooling.seed_runs`, a tooling-owned ledger created on demand (not application/domain schema, not Drizzle-managed). Seeding is idempotent.
- Raw SQL is confined to `db/tooling`. No new dependencies; no `drizzle-kit push`; no migrations; no domain schema or seed data; no workflow changes.

## 8. Functional verification performed (DEV only; PROD never accessed)

The sandbox's configured `.env`/environment targets `DATABASE_ENV=dev` (I did not print or inspect the URL). Commands run from `apps/web` via `corepack pnpm run ...`:

- `db:reset --env=dev` -> `truncated 0 table(s).` (clean DEV).
- `db:seed --env=dev` -> `applied [tooling-smoke].`
- `db:seed --env=dev` again -> `applied [].` (idempotent).
- `db:refresh --env=dev` -> `truncated 1 table(s); applied [tooling-smoke].`
- `db:reset --env=dev` -> `truncated 1 table(s).` (leaves DEV with an empty ledger).
- Refusals (exit 1, before any query): `db:seed` with no `--env` ("pass the target explicitly"); `db:seed --env=prod` and `db:reset --env=qa` against DEV ("--env does not match DATABASE_ENV"); `db:seed --force` ("Unknown argument").

## 9. Test/lint/typecheck/build results (latest run)

`pnpm` is not on PATH; `corepack pnpm` used (`corepack pnpm install --frozen-lockfile` ok).

- `vitest run` in `apps/web`: 5 files, 56 tests passed.
- `vitest run` in `packages/shared`: 3 files, 31 tests passed.
- `pnpm run lint` (`apps/web`): clean.
- `pnpm run typecheck` (`apps/web`): no errors.
- `pnpm run build` (`apps/web`): succeeded.
- `packages/validation` tests were not run separately.

## 10. Not tested, and why

- Prod and stage refusals were verified by unit tests (`tooling.test.ts`) only, not by running the CLI with those values: the sandbox did not allow overriding environment variables for a command, and doing so with real credentials would be inappropriate anyway.
- `qa` reset/seed was not run against a real qa database (no qa credentials available). Code path is identical to dev.
- Reset against a database with real application tables/migrations was not exercised (none exist); truncate quoting/cascade behavior is unit-tested with a fake executor, and the real ledger truncate was exercised on DEV.
- Production and stage databases were not accessed.

## 11. Unresolved concerns

- The ledger table lives outside Drizzle management; if a future migration system diffs the database, it may need to ignore the `signalone_tooling` schema.
- `TRUNCATE ... CASCADE` on all `public` tables is appropriate for dev/qa; revisit if qa ever shares data deliberately retained across runs.
- Guard cannot detect a `DATABASE_URL` pointing at the wrong Neon branch while `DATABASE_ENV` is correct-looking (documented limitation in `docs/environment.md`); configure secrets carefully.

## 12. Recommended next steps

- Separate issue: migration execution/promotion procedure (dev -> qa -> stage -> prod).
- Add a `NEON_QA_DATABASE_URL`-based qa run once qa automation exists, and exercise `--env=qa`.
- Add domain seeds alongside the first domain schema.
