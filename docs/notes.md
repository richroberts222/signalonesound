# Handoff Notes (overwritten on every update; see docs/issues.md on branch 0302)

## 1. Identification
- Issue: #19 "Build validated environment and configuration foundation"
- Current branch: `claude/issue-19-20261001-0338`, cut from `main` at 8ddce2f ("Update claude.yml"). It contains no Issue 19 code and no handoff-workflow files; only this report was added.
- Task: read-only comparison of `origin/claude/issue-19-20261001-0225` (0225) and `origin/claude/issue-19-20261001-0226` (0226). No consolidation, merge or code change was done.

## 2. Branch access: now works
- `git fetch origin` succeeded. `git branch -a`, `git log`, `git diff --stat` and `git show <ref>:<path>` all worked on 0225, 0226, 0302 and 0321.
- Not available: `git worktree add` and shell variable expansion (`$f`) need approval. I read files with literal `git show` paths instead. Nothing was missed because of this.
- Code was read, not executed. No lint, typecheck, build, test or `db:check` was run on either branch, so all "verified" statements from earlier comments are still unverified by me.

## 3. Facts about the branches
| Branch | Commits beyond base | Base | Content |
|---|---|---|---|
| 0225 | `ef7c1da` | d27aff5 (older than current main 8ddce2f) | env foundation, 24 files |
| 0226 | `d14d827` | d27aff5 | env foundation, 21 files |
| 0302 | handoff workflow | d27aff5 | `CLAUDE.md` line 59, `docs/issues.md`, `docs/notes.md` (4 files, includes a `claude.yml` edit) |
| 0321 | comparison-blocked report | d27aff5 | `docs/notes.md` only |

Important: both 0225 and 0226 (and 0302) touch `.github/workflows/claude.yml`, but only because they were cut before main's latest workflow update. The diff against main would REVERT main's workflow (e.g. `fetch-depth`, allowed tools). Never take `claude.yml` from any of them. (The GitHub App cannot push workflow edits anyway.)

## 4. 0225 vs 0226 differences
Files only in 0225: `packages/shared/src/env.ts`, `packages/shared/src/env.test.ts`, `docs/environment.md`, edits to `packages/shared/src/index.ts`, `packages/shared/package.json`, root `package.json` (`test` = `pnpm -r --if-present test`), `docs/mobile.md`, `security.md`, `shared-code.md`, `apps/web/db/env.ts` kept as a thin wrapper.
Files only in 0226: `apps/web/lib/env/app-env.ts`, `server-schema.ts`, `env.test.ts`, `docs/environments.md`, `docs/auth.md`, `docs/boilerplate-gap-report.md`; `apps/web/db/env.ts` deleted. No root `test` script, so `pnpm test` at root would not exist (comments cite `pnpm --filter web test`).
Both: `lib/env/server.ts` (`server-only`, lazy), `lib/env/client.ts`, `db/index.ts`, `drizzle.config.ts`, `scripts/db-check.mjs` -> `db-check.ts` run via `tsx`, `.env.example`, `next.config.ts` `transpilePackages`, `apps/web/package.json` (`tsx`, `vitest`, `@signalone/shared`), `pnpm-lock.yaml`, `deployment.md`, `database.md`, `testing.md`.

| Topic | 0225 | 0226 |
|---|---|---|
| Where validation lives | `packages/shared` (pure functions over a plain record; never reads `process.env`) | `apps/web/lib/env` (only `APP_ENVS` comes from shared) |
| Mobile reuse | Direct: Expo can call `parseClientEnv` with `EXPO_PUBLIC_*` values | None without moving code later; `client.ts` is web-shaped |
| APP_ENV / DATABASE_ENV | `DATABASE_ENV` required. `APP_ENV` optional, defaults to `DATABASE_ENV`. Mismatch only rejected when one is prod and the other not (dev vs qa mismatch is allowed) | `APP_ENV` canonical. `DATABASE_ENV` accepted as legacy fallback. If both set they must be identical. Single variable going forward |
| Server vs client split | `parseServerEnv`, `parseDatabaseEnv`, `parseClientEnv` (also optional `NEXT_PUBLIC_APP_ENV`), `isClientExposedName`. `server.ts` guarded by `server-only` | `app-env.ts` (client-safe), `server-schema.ts` (pure), `server.ts` (`server-only`), `client.ts`. Static tests check the boundary |
| Error handling | `EnvValidationError` collects ALL issues, names variables, never echoes values | `EnvError`, fails on first issue. Echoes the invalid `APP_ENV` value (low risk, not a secret) |
| Prod guards | Prod/non-prod mismatch; Vercel `preview` + prod; `assertDestructiveAllowed(target, allowed, op)` fails closed, refuses prod even if allow-listed. drizzle-kit allows dev/qa/stage, db:check dev only | `APP_ENV=prod` refused on any Vercel env other than `production` (covers preview AND development); `assertNotProd` for drizzle-kit; `assertDestructiveAllowed(env, op)` allows only dev/qa; Clerk `sk_live_` key refused outside prod; db:check requires `appEnv === "dev"` |
| DB URL validation | Required and non-blank only | Must parse as URL with postgres/postgresql protocol; error never echoes it |
| Neon/Drizzle | `db/env.ts` wrapper calls shared `parseDatabaseEnv`; `db/index.ts` still uses it | `db/index.ts` uses `getDatabaseEnv()`; `db/env.ts` deleted |
| Clerk | Clerk keys read in `parseServerEnv`/`parseClientEnv`; Clerk itself untouched | Same, plus `sk_live_` guard; Clerk itself untouched |
| Vercel | Optional `APP_ENV`: existing Vercel config works unchanged | Existing config works unchanged via the `DATABASE_ENV` fallback, but docs tell users to migrate to `APP_ENV` |
| GitHub Actions | Documents `claude.yml` (`DATABASE_ENV=dev`, `NEON_DEV_DATABASE_URL`) as compatible | Same conclusion in comments; workflow only uses the OAuth token |
| db:check | Dev only via `assertDestructiveAllowed` | Dev only via explicit comparison |
| Tests (as written) | Vitest in `packages/shared`: 17 tests across parseServerEnv, parseDatabaseEnv, parseClientEnv, assertDestructiveAllowed, isClientExposedName. Runs from root `pnpm test` | Vitest in `apps/web`: 21 tests incl. 4 static boundary tests (server module has `server-only`, client module reads no secrets, `"use client"` files never import server env/db, no raw secret reads outside `lib/env` and tooling), `sk_live_`, malformed URL |
| Docs | New `docs/environment.md`; short edits to deployment, security, testing, mobile, shared-code, database | New `docs/environments.md` (fuller variable table with scope and location); edits to deployment, database, auth, testing, gap report. Leaves stale `DATABASE_ENV` wording in `docs/security.md`, `docs/web.md`, `boilerplate-references-report.md` |

## 5. Verification represented by each branch (from their commit/comments, not re-run by me)
- 0225: unit tests, `db:check` against Neon dev, `drizzle-kit generate` loading config (drizzle output deleted), temporary `"use client"` import of `server.ts` failing the build, lint/typecheck/build/test. Prod CLI refusal not run.
- 0226: unit tests, `db:check`, `drizzle-kit check`, temporary `"use client"` build failure, lint/typecheck/build/tests. Prod and invalid-value CLI refusal not run.
- Neither is re-verified here. After consolidation everything must be rerun.

## 6. Conflicts with architecture rules
- `docs/shared-code.md` / CLAUDE.md section 7: shared code should hold validation schemas and constants but must not expose server-only secrets. 0225's `parseServerEnv` in the shared package reads secret names but never values, and nothing mobile calls it; acceptable, but should be documented as "never call from client". 0226's approach keeps server parsing in web, which is the more conservative reading.
- CLAUDE.md section 7 also says not to duplicate business logic across clients. 0226 would force a later move or duplication for Expo; 0225 avoids that.
- Neither adds domain tables, migrations, seed/reset, or renames. Neither changes Clerk architecture. Neither contradicts `docs/database.md` section 2 (explicit environment, no hostname inference).
- Architectural question not settled by docs: whether `APP_ENV` replaces `DATABASE_ENV`. `docs/database.md` currently names `DATABASE_ENV`. Treat as a decision for the owner (see section 8).

## 7. Recommendation
Neither is a clean superset. Use **0225 as the base** (shared pure validation fits the multi-client goal and has a root `pnpm test`), and port these 0226 items on top:
1. `APP_ENV` as the canonical selector with `DATABASE_ENV` legacy fallback and strict equality when both are set (closes 0225's gap where dev vs qa mismatch passes).
2. Vercel guard broadened from `preview` only to anything other than `production` when env is prod.
3. Clerk `sk_live_` rejected outside prod.
4. DATABASE_URL protocol/parse validation without echoing it.
5. The static client/server boundary tests (adapt paths; they can live in `apps/web` with Vitest, or be a web-side test file if a web test runner is accepted).
6. `docs/environments.md`'s fuller variable table, merged into one doc. Pick a single filename (suggest `docs/environments.md`; delete `environment.md`), and fix stale `DATABASE_ENV` wording in `security.md`, `web.md`, gap/references reports.
7. Keep 0225's collect-all-issues `EnvValidationError`; keep `db/env.ts` thin wrapper or delete it (0226 style) so there is one path.
Do not port: 0226's web-local `APP_ENVS` re-export duplication beyond what is needed, any `claude.yml` change.

## 8. Safest consolidation strategy for the target branch
1. Start from current `main` (8ddce2f), not from 0225/0226 (they are based on older d27aff5).
2. Bring 0302's handoff files first: `git show origin/claude/issue-19-20261001-0302:docs/issues.md`, and the CLAUDE.md line 59 addition. Do NOT take its `claude.yml`.
3. Apply 0225 with `git cherry-pick -n ef7c1da` (or checkout individual paths), excluding `.github/workflows/claude.yml`. Regenerate `pnpm-lock.yaml` with `pnpm install` rather than trusting either branch's lockfile.
4. Port items from section 7 by hand into `packages/shared/src/env.ts` and tests; resolve the doc name.
5. Run `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm --filter web db:check` (dev only), and the "use client" build-failure check; then overwrite this file.
Decision needed from the owner: confirm `APP_ENV` canonical with `DATABASE_ENV` legacy fallback (my recommendation, matches the issue's "explicit environment identification" and avoids two variables), versus 0225's "APP_ENV optional".

## 9. Not tested / concerns
- Nothing was executed; this is a code-reading comparison only.
- Neither branch's results have been independently reproduced.
- Preview-to-database policy is still undecided (`docs/database.md`).
- `@signalone/shared` ships TypeScript source with extensionless imports, so it works under Next, tsx and Vitest but not plain `node` (reported on 0226; 0225 uses `tsx` for the same reason).
- `docs/api.md`, `routing.md`, `server-components.md` remain empty; no rules were invented.

## 10. Lint / typecheck / build / test
Not run for this task (docs-only change on a branch without the foundation code).
