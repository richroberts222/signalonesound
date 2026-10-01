# Handoff: Issue 19 branch comparison (0225 vs 0226)

> Overwritten on every Claude run (see the handoff rule on the `0302` branch, `docs/issues.md`). Latest state only.

## Identification

- Issue: #19 "Build validated environment and configuration foundation"
- Current branch: `claude/issue-19-20261001-0321` (cut from `main` at `d27aff5`)
- Task: read-only comparison of `claude/issue-19-20261001-0225` and `claude/issue-19-20261001-0226`, with a recommendation. No consolidation.

## Result: the comparison could NOT be performed from the branch contents

No branch contents were inspected. Every statement about 0225 and 0226 below comes from the earlier Claude comments on Issue 19. Those are Claude's own summaries, not the code. Treat them as unverified.

### What was and was not inspectable

| Mechanism | Result |
| --- | --- |
| Local git refs | Only `main`, `origin/main` and the current branch exist. Neither 0225, 0226 nor 0302 is present. |
| `git fetch` / `git ls-remote` | Not retried, as instructed. The earlier runs report it was denied. |
| `gh api repos/.../branches` (read-only GitHub API) | Denied: "requires approval". |
| WebFetch of the GitHub branch page | Denied: permission not granted. |

I did not guess at file contents, diffs or test code.

### Fixed facts about this branch (verified)

- It matches `main`. `docs/` has no `environment.md`, `environments.md`, `issues.md` or `notes.md` before this file.
- It has no env foundation, no tests, and no handoff workflow. The handoff workflow is on `0302`.
- No code was changed on this branch.

## Secondhand summary (from earlier Claude comments, unverified)

| Topic | 0225 | 0226 |
| --- | --- | --- |
| Validation location | `packages/shared/src/env.ts`, pure functions over a plain record. Does not read `process.env`. | `apps/web/lib/env/` (`app-env.ts`, `server-schema.ts`, `server.ts`, `client.ts`) |
| Shared package | Holds the parsers. Web depends on `@signalone/shared` with `transpilePackages`. | Shared holds only `APP_ENVS`. Validators live in web. |
| Docs file | `docs/environment.md` | `docs/environments.md` |
| APP_ENV / DATABASE_ENV | `APP_ENV` is optional and defaults to `DATABASE_ENV`. Disagreement about being `prod` fails. | `APP_ENV` is canonical. `DATABASE_ENV` is a legacy fallback. If both are set they must match. |
| Server vs client | `lib/env/server.ts` (`server-only`, lazy `getServerEnv`) and `lib/env/client.ts` (`NEXT_PUBLIC_*`). | The same split, plus `getDatabaseEnv()`. |
| Prod guards | `assertDestructiveAllowed` refuses unknown targets and `prod`, and needs an allow-list. `VERCEL_ENV=preview` with `prod` fails. `db:check` allows `dev` only. `drizzle-kit` allows dev/qa/stage. | `assertNotProd` and `assertDestructiveAllowed` (dev/qa only, fail closed). `APP_ENV=prod` is rejected on Vercel Preview or Development. A `sk_live_` Clerk key is rejected outside prod. `drizzle.config.ts` refuses prod. |
| Neon / Drizzle / db:check | `db/env.ts` delegates to shared. `db-check.mjs` became `db-check.ts` run via `tsx`. | `db/env.ts` deleted. `db-check.ts` via `tsx`. |
| Tests | Vitest in `packages/shared` (`env.test.ts`): 17 tests. | Vitest in `apps/web`: 21 tests, including static client/server boundary checks. |
| Reported verification | `db:check` on Neon dev passed. `drizzle-kit generate` loaded the config. A temporary `"use client"` import of the server module failed the build. Lint, typecheck, build and tests passed. | `db:check` on Neon dev passed. `drizzle-kit check` passed. The same `"use client"` build failure was shown. Lint, typecheck, build and tests passed. |
| Not tested | prod refusal through the real CLIs | prod and invalid `APP_ENV` refusal through the real CLIs |

## Preliminary assessment (reasoning only, not verified against code)

- Architecture rules: the Issue 19 text asks for env logic that can later support Expo and for no duplication. A pure shared parser (0225) fits `docs/shared-code.md` and `docs/mobile.md` better. 0226 puts validators in web, which Expo could not reuse without extracting them later. This reasoning relies on the earlier summaries.
- Compatibility: 0225 keeps current Vercel setups working because `APP_ENV` defaults to `DATABASE_ENV`. 0226 does too, through its legacy fallback.
- Stronger guards in 0226 look worth keeping: the Clerk `sk_live_` check, the Vercel Development check, and the static boundary tests. 0225 appears to lack these.
- Neither summary shows a conflict with the architecture rules. I cannot confirm that without the code.
- Both claim the same functional checks. Neither has run on this branch.
- I cannot say that one branch is clearly more complete. Both are plausible bases.

## Proposed consolidation strategy for `0302` (to confirm once the code is visible)

1. Make 0302 the target, so the handoff workflow is kept. A human merges or fetches. I could not fetch.
2. Take 0225's structure as the base: shared pure parsers, `docs/environment.md`.
3. Port from 0226 only the extra guards and the static boundary tests.
4. Decide `APP_ENV` semantics explicitly: 0225 defaults it to `DATABASE_ENV`, 0226 makes it canonical. Choose one and update the docs.
5. Use one docs filename. Do not keep both `environment.md` and `environments.md`.
6. Do not blindly overwrite the files on `0302`. Re-run lint, typecheck, build, tests and `db:check`. Overwrite this file with the real results.

If a human can run `git fetch origin && git diff --stat origin/claude/issue-19-20261001-0225 origin/claude/issue-19-20261001-0226`, or allow `Bash(git fetch:*)` and `Bash(gh api:*)`, I can replace the secondhand section with an actual diff.

## Validation

None run. No code changed. Lint, typecheck, build, tests and `db:check` were not run because this commit only adds this file.

## Unresolved concerns

- The 0225 vs 0226 choice is unresolved.
- `APP_ENV` canonical or defaulted is an undecided architectural question.
- The Preview-to-database policy is still undecided.
- Five branches exist for one issue (0225, 0226, 0302, 0309, 0311, plus this one). Please clean up after consolidation.

## Next steps

1. Provide read access (fetch or `gh api`), or a human-supplied diff.
2. Re-run this comparison against the actual code.
3. Then consolidate and validate.
