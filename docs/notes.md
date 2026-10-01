# Notes: Issue 19 branch comparison

Comparison only. Nothing was merged, cherry-picked, or changed in the environment implementation.

## 1. Branch access

Both branches are accessible after `git fetch origin`; `git log`, `git diff --stat`, and `git show <ref>:<path>` all work.

| Branch | Commit | Size vs `origin/main` |
| --- | --- | --- |
| `claude/issue-19-20261001-0225` ("A") | `ef7c1da` | 23 files, +981/-70 |
| `claude/issue-19-20261001-0226` ("B") | `d14d827` | 20 files, +1027/-76 |

Other Issue 19 branches also exist (`-0302` = this PR, `-0321`, `-0338`). The last two only carry earlier versions of this report.

## 2. Differences

| Area | A (0225) | B (0226) |
| --- | --- | --- |
| Where validation lives | `packages/shared/src/env.ts`, pure functions that take a plain record. Reusable by web and future Expo. | `apps/web/lib/env/{app-env,server-schema}.ts`. Web-only. Only `APP_ENVS` comes from shared. |
| Env variables | `DATABASE_ENV` required. `APP_ENV` optional, defaults to `DATABASE_ENV`. | `APP_ENV` canonical. `DATABASE_ENV` accepted as a legacy fallback. If both are set they must match. |
| Prod guards | `APP_ENV` and `DATABASE_ENV` must agree on prod. `VERCEL_ENV=preview` rejects prod. | `APP_ENV=prod` rejected when `VERCEL_ENV` is not `production`. `sk_live_` Clerk key rejected outside prod. |
| `DATABASE_URL` checks | Non-empty only. | Must parse as a URL with a `postgres:` or `postgresql:` protocol. The value is never echoed. |
| Destructive guard | `assertDestructiveAllowed(target, allowed, op)`. Callers pass the allow-list. `prod` is always refused. | `assertDestructiveAllowed(env, op)` with a fixed allow-list of `dev` and `qa`. Also `assertNotProd`, used by `drizzle.config.ts`. |
| Error reporting | `EnvValidationError` collects all issues and reports them together. | `EnvError` throws on the first problem. |
| Client env | `parseClientEnv`, with optional `NEXT_PUBLIC_APP_ENV`. Mobile can map `EXPO_PUBLIC_*` onto the same shape. | `parseClientEnv` for the Clerk publishable key only. |
| `db/env.ts` | Kept as a thin wrapper, `loadDatabaseEnv()`. | Deleted. `db/index.ts` and `drizzle.config.ts` use `getDatabaseEnv` or `parseDatabaseEnv` directly. |
| Tests | `packages/shared/src/env.test.ts` (123 lines, Vitest in shared). Pure logic only. | `apps/web/lib/env/env.test.ts` (152 lines, Vitest in web). Also has static checks that fail if secrets are read from `process.env` directly in `app`, `components`, `db`, or `lib`, and a check of the client/server boundary. |
| Docs | `docs/environment.md`. Edits to `mobile.md`, `security.md`, `shared-code.md`, `database.md`, `deployment.md`, `testing.md`. Documents the existing `claude.yml` (`DATABASE_ENV=dev`, `NEON_DEV_DATABASE_URL`). | `docs/environments.md`. Edits to `auth.md`, `boilerplate-gap-report.md`, `database.md`, `deployment.md`, `testing.md`. Says the current workflows need no application configuration. That is inaccurate, because `claude.yml` sets `DATABASE_ENV` and `DATABASE_URL`. |
| Other | Root `package.json` and `packages/shared/package.json` changed to add a test script. Adds `docs/security.md`, `mobile.md`, and `shared-code.md` notes. | Adds `docs/boilerplate-gap-report.md` and `docs/auth.md` notes. |
| Both | `db:check` moved from `.mjs` to `tsx` `.ts`, `server-only` guard on `lib/env/server.ts`, lazy cached validation, Vitest added, and `pnpm-lock.yaml` regenerated (these lockfiles will conflict). | Same. |

## 3. Recommendation: use A (0225) as the base

1. **Platform fit.** `CLAUDE.md` sections 7 and 8 and `docs/shared-code.md` call for shared validation logic that Web, Android, and iPhone can all use. A puts pure, runtime-agnostic validation in `@signalone/shared`, and it accepts a plain record so it can take `EXPO_PUBLIC_*`. B keeps validation in `apps/web`, so mobile would have to move it or duplicate it later. B's docs say as much.
2. **Compatibility with current config.** A keeps `DATABASE_ENV`, which `claude.yml`, Vercel, and the existing `db/` code already use. Nothing breaks and no workflow file edit is needed. The GitHub App cannot edit workflow files.
3. **Better error reporting.** A reports all issues at once.
4. **Safer destructive guard.** Callers pass an explicit allow-list, and prod is always refused, even if a caller lists it.
5. **Accurate CI docs.** A's docs match the real `claude.yml`.

## 4. Worth preserving from B

Port these onto A:

1. **`DATABASE_URL` protocol validation.** Parse it as a URL, require `postgres:` or `postgresql:`, and never echo the value. Add it to `parseDatabaseEnv` and `parseServerEnv`.
2. **`sk_live_` Clerk key rejected when the environment is not prod.** Add it to `parseServerEnv`.
3. **`assertNotProd(env, op)` helper.** It is a simple, useful guard for non-destructive tooling such as drizzle-kit.
4. **Static boundary tests from `env.test.ts`.** These are the guard against secrets read from raw `process.env` outside the env modules, and the check that client modules do not import server modules. Place them in `apps/web` (the shared package cannot see web files), alongside A's shared unit tests. This needs a Vitest setup in `apps/web`, which B already has.
5. **`APP_ENV=prod` on a non-`production` Vercel deployment.** A only rejects `VERCEL_ENV=preview` combined with prod. Use B's broader check (`VERCEL_ENV` set and not `production`). Check this against Vercel's `development` value, which is only used locally.
6. **Docs content.**
   - The environment/Clerk-key table from B's `docs/environments.md`.
   - The Preview caveat that a wrong `DATABASE_URL` cannot be detected by code.
   - The "migrate to `APP_ENV`" note.
   - The `docs/auth.md` cross-reference.
   - The `docs/boilerplate-gap-report.md` update.
   - B's EAS build-profile mapping (`development`, `qa`, `staging`, `production`) to `dev`, `qa`, `stage`, `prod`.

Not carried over from B:
- Deleting `db/env.ts`.
- Fail-on-first-error reporting.
- The fixed `dev`/`qa` allow-list.
- The inaccurate "no workflow config" statement.

## 5. Consolidation plan

All work happens on this branch (`claude/issue-19-20261001-0302`). It is based on `main` and does not yet contain either implementation. No new feature branch, no merge to `main`.

1. Decide the doc name. A uses `docs/environment.md`, B uses `docs/environments.md`. Keep one (suggest `docs/environments.md`, matching the plural doc naming) and update links.
2. Bring in A's full change set. Use `git checkout origin/claude/issue-19-20261001-0225 -- <paths>` for all A files, or a single `git cherry-pick ef7c1da` onto this branch. A is a single commit, so cherry-pick is simplest. Regenerate `pnpm-lock.yaml` with `pnpm install` rather than resolving conflicts by hand.
3. Apply the B ports from section 4, one commit each:
   - (a) URL protocol validation and `sk_live_` rejection in `packages/shared/src/env.ts`, with new cases in `env.test.ts`.
   - (b) `assertNotProd`, used by `drizzle.config.ts`.
   - (c) Broadened `VERCEL_ENV` check, with a test.
   - (d) B's static boundary tests in `apps/web`, plus the Vitest config and `test` script.
4. Merge the docs into one environment doc, keeping A's accurate CI and Vercel description. Add B's table, caveats, and EAS mapping. Add the cross-references in `auth.md`, `database.md`, `deployment.md`, `testing.md`, `mobile.md`, `shared-code.md`, `security.md`, and `boilerplate-gap-report.md`.
5. Validate: `pnpm install`, `pnpm test`, `pnpm --filter web typecheck`, `pnpm --filter web lint`, `pnpm --filter web build`. `pnpm --filter web db:check` runs only if dev secrets are available.
6. Update this PR's description and `docs/issues.md`. Merge to `main` is a separate decision for the owner.
7. After consolidation, the old branches `-0225`, `-0226`, `-0321`, and `-0338` can be deleted. Do this only on explicit instruction.

Open items for the owner:
- Whether `APP_ENV` should eventually become the single canonical name (B's direction), with `DATABASE_ENV` deprecated. The plan above keeps A's behaviour for now.
- The Vercel Preview `DATABASE_URL` target (`qa` or `stage`), still undecided per `docs/database.md` section 15.
