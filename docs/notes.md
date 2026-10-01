# Notes: Issue 43 "Build and Prove Reusable Database Migration Foundation"

1. Issue: #43
2. PR: none yet at time of writing (open one from this branch; further @claude requests should come from that PR).
3. Canonical branch: `claude/issue-43-20261001-1804`, base `main`. Not merged.
4. Latest commit: the commit containing this file; see `git log -1`.

## 5. Work completed

- Migration runner (`apps/web/db/tooling/migrate.ts`): fail-closed `resolveMigrationTarget` (same rules as reset/seed: validated `DATABASE_ENV`/`DATABASE_URL`, `APP_ENV` equals `DATABASE_ENV`, never on Vercel, explicit `--env` matching `DATABASE_ENV`; allow-list dev/qa/stage; prod refused). Pure `computeStatus`, read-only history/schema readers.
- Scripts: `db:migrate` (replaces `drizzle-kit migrate`; applies via drizzle's neon-http migrator, idempotent, refuses unknown DB history), `db:migrate:status`, `db:migrate:verify`; `db:generate` kept. No `drizzle-kit push` script (test-enforced).
- Smallest generic schema change: `migration_proof` table in `db/schema.ts`; generated `drizzle/0000_migration_proof.sql` plus `drizzle/meta` (committed).
- `docs/database.md`: new section 12.3 (workflow DEV->QA->STAGE->PROD, forward-only, recovery/rollback, migrations vs backups/restore) and status updates.
- Reset/seed foundation untouched.

## 6. Files changed

`apps/web/db/schema.ts`, `apps/web/db/tooling/{migrate.ts,migrate.test.ts,cli.ts}`, `apps/web/scripts/db-migrate{,-status,-verify}.ts`, `apps/web/package.json`, `apps/web/drizzle.config.ts` (comment only), `apps/web/drizzle/**`, `docs/database.md`, `docs/notes.md`.

## 7. Architectural decisions

- The runner applies migrations itself rather than via `drizzle-kit migrate` so the shared guard and explicit `--env` apply (drizzle-kit only runs the config's coarser check).
- Local tooling may migrate dev/qa/stage; prod is refused and left to a deliberate human process (not yet automated; undecided).
- The `migration_proof` table is intentionally generic and will ship to every environment with the migration.

## 8. Functional verification performed (DEV only)

Against the runner's configured `DATABASE_ENV=dev` database (guard accepted it; no URL is recorded here):
1. `db:generate --name=migration_proof` (with a throwaway local placeholder config, no connection) produced `0000_migration_proof.sql`.
2. `db:migrate:status --env=dev` before: applied 0, pending 1.
3. `db:migrate --env=dev`: applied `0000_migration_proof`; applied=1 pending=0.
4. Re-run `db:migrate --env=dev`: "no pending migrations; nothing applied."
5. `db:migrate:status --env=dev`: applied 1, pending 0. `db:migrate:verify --env=dev`: `migration_proof` columns match.
6. Live rejections: `db:migrate` with no `--env` refused; `--env=prod` refused (does not match DATABASE_ENV). Other unsafe configs (prod, missing/invalid env, APP_ENV mismatch, Vercel, stage allowed only when explicit) are covered by unit tests.
STAGE and PROD were not accessed.

## 9. Test/lint/typecheck/build results (latest run)

`pnpm` is not on PATH; ran `corepack pnpm -r --if-present lint|typecheck|test` and `corepack pnpm --filter web build` (root `validate` script itself could not run for that reason):
- lint: clean (web, mobile). typecheck: clean (validation, web, mobile).
- tests: web 7 files / 85 passed; mobile 2 files / 7 passed; validation 2 files / 18 passed.
- web `next build`: succeeded, 5 routes.

## 10. Not tested, and why

- QA/STAGE/PROD migration: out of scope by instruction.
- Failure mid-migration, and Neon restore: not exercised.
- Unsafe-env rejection against the real CLI was shown only for missing/mismatched `--env`; other cases only via unit tests (shell could not override env vars).

## 11. Unresolved concerns

1. Production application procedure and restore runbook are undefined.
2. `migration_proof` is a non-domain table that will exist in all environments; remove via a later forward migration when real schema arrives if unwanted.
3. `migrate:verify` only knows the proof table.

## 12. Recommended next steps

1. Open PR and review. 2. Define the prod migration procedure and Neon restore runbook. 3. Migrate qa, then stage, deliberately, in follow-up work.
