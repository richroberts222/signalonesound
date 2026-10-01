# Notes: Issue 19 consolidation (final state of this branch)

- Issue / PR: Issue 19 environment/configuration, PR #20 "Add issue/PR handoff workflow (docs/issues.md, docs/notes.md)"
- Branch: `claude/issue-19-20261001-0302`, base `main`. Not merged. No other branch created.

## 1. Work completed

- Discarded the unintended uncommitted removal from `CLAUDE.md` (`git checkout CLAUDE.md`); the committed `/docs/issues.md` reference is preserved.
- Cherry-picked the 0225 implementation (`ef7c1da`, now `f966f3f`) as the foundation. It applied with no conflicts.
- Ported from 0226 (commit `ef7c1da` + working changes, see section 2):
  - `DATABASE_URL` validation: must be a `postgres:`/`postgresql:` URL; the value is never echoed. Implemented with a regex rather than `new URL` because `@signalone/shared` has no DOM/Node typings and must run in React Native.
  - Live Clerk key (`sk_live_`) rejected outside `prod`.
  - `assertNotProd(target, operation)` added to `@signalone/shared`.
  - Broadened Vercel guard: `prod` (app or database) is rejected whenever `VERCEL_ENV` is set and is not `production`.
  - Static client/server boundary tests in `apps/web` (Vitest added there).
  - Docs: environment mapping table, EAS profile mapping, wrong-`DATABASE_URL` caveat.
- Applied owner decisions: `APP_ENV` and `DATABASE_ENV` stay separate; Vercel Preview maps to `qa`; `stage` is protected and not for ordinary previews. New rule: Preview + `stage` is rejected.

## 2. Files changed (relative to the branch before this run)

Cherry-picked from 0225 (23 files): `apps/web/.env.example`, `db/env.ts`, `db/index.ts`, `drizzle.config.ts`, `lib/env/client.ts`, `lib/env/server.ts`, `next.config.ts`, `package.json`, `scripts/db-check.mjs` (deleted) -> `scripts/db-check.ts`; `docs/{database,deployment,environment,mobile,security,shared-code,testing}.md`; root `package.json`; `packages/shared/{package.json,src/env.ts,src/env.test.ts,src/index.ts}`; `pnpm-lock.yaml`.

Edited or added on top of it:
- `packages/shared/src/env.ts` (URL check, live-key check, Vercel guard, Preview/stage rule, `assertNotProd`)
- `packages/shared/src/env.test.ts` (22 tests)
- `apps/web/lib/env/boundary.test.ts` (new, 4 tests)
- `apps/web/package.json` (`test` script, `vitest` dev dependency), `pnpm-lock.yaml`
- `docs/environment.md`, `docs/deployment.md`, `docs/database.md` (section 15 Preview policy now decided), `docs/testing.md`
- `docs/notes.md` (this file)

## 3. Final architectural decisions

- Validation lives in `@signalone/shared` as pure functions over a plain record (usable by web and future Expo).
- `APP_ENV` (runtime) and `DATABASE_ENV` (database target) are separate; `APP_ENV` defaults to `DATABASE_ENV`. A prod/non-prod mismatch is rejected in both directions.
- Mapping: local = `dev`, Preview = `qa`, pre-production = `stage`, production = `prod`.
- Guards: `assertDestructiveAllowed(target, allowList, op)` (prod always refused); `assertNotProd`. `drizzle.config.ts` keeps A's stricter allow-list (`dev`/`qa`/`stage`) rather than B's looser `assertNotProd`. `db:check` allows `dev` only.
- All issues are reported together (A), not first-error (B).
- Kept `docs/environment.md` (singular; already referenced from code and other docs) instead of renaming to B's `environments.md`. This deviates from the earlier suggestion in the old notes.
- Kept `db/env.ts` wrapper (not deleted as in B).
- `VERCEL_ENV=preview` with `dev` is not rejected, to avoid breaking existing Preview config during transition; docs say Preview should use `qa`.

## 4. Functional verification and results

All run on this branch after the final code change. `pnpm` was not on PATH in this runner, so commands were run via `corepack pnpm --dir <package> <script>`.

| Check | Result |
| --- | --- |
| `packages/shared` test | 22/22 passed |
| `apps/web` test | 4/4 passed |
| `packages/shared` typecheck | passed |
| `apps/web` typecheck | passed |
| `apps/web` lint | passed (no output) |
| `apps/web` build | passed (5 routes) |
| `apps/web` `db:check` | `OK: connected to Neon (DATABASE_ENV=dev), SELECT 1 succeeded.` |

Functional checks of the guards (prod/Preview/live-key/URL cases) are covered by the unit tests only.

## 5. Not tested, and why

- Root `pnpm test`/`pnpm typecheck`/`pnpm lint`/`pnpm build`: the root scripts call nested `pnpm`, which is not on PATH here (`pnpm: not found`). The equivalent per-package scripts were run instead and are the same commands the root scripts fan out to.
- Ad-hoc runs of `db:check` with a fake `prod` value or a `mysql://` URL: the shell sandbox would not allow env-prefixed commands. Covered by unit tests instead.
- Vercel Preview behaviour with real Vercel variables: not verifiable here.
- Nothing touched qa/stage/prod. No production data was accessed. No migrate, seed, or reset was run.

## 6. Unresolved concerns

- Existing Vercel Preview variables must be switched to `qa` values; code cannot detect a `DATABASE_URL` that points at the wrong Neon branch.
- A Preview using `dev` is currently tolerated, not rejected. Tighten to "Preview must be `qa`" once Vercel is configured.
- The workflow `claude.yml` sets only `DATABASE_ENV=dev` (no `APP_ENV`); that works because `APP_ENV` is optional.
- Whether `APP_ENV` becomes the single canonical name (deprecating `DATABASE_ENV`) is still undecided.
- `pnpm-lock.yaml` was regenerated with `--no-frozen-lockfile` after adding `vitest` to `apps/web`; it should be reviewed by CI with `--frozen-lockfile`.

## 7. Recommended next steps

1. Review and merge this PR (owner decision; not done here).
2. Set Vercel Preview variables to `qa` (`DATABASE_ENV=qa`, `APP_ENV=qa`, qa Neon URL, Clerk development keys).
3. Make `pnpm` available on PATH in the Claude Actions runner so root scripts work.
4. After merge, delete obsolete branches `-0225`, `-0226`, `-0321`, `-0338` on explicit instruction.
5. Then build reset/seed on `assertDestructiveAllowed` with a `dev`/`qa` allow-list (out of scope here).
