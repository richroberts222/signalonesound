# Handoff Notes (overwritten on every update; see docs/issues.md)

## Identification
- Issue: #19 "Build validated environment and configuration foundation"
- Branch: `claude/issue-19-20261001-0302` (base: `main`, at d27aff5)

## IMPORTANT: Issue 19 implementation is NOT on this branch
Earlier runs for Issue 19 reported implementing the environment foundation on separate branches (`claude/issue-19-20261001-0225` and `claude/issue-19-20261001-0226`). This branch was created fresh from `main` and contains none of that code (no `packages/shared/src/env.ts`, no `apps/web/lib/env/*`, no `docs/environment(s).md`, no `APP_ENV`). The runner could not fetch those branches (git fetch requires approval and was not granted), so I could not merge or cherry-pick them. I did not re-implement the foundation, since that was not requested, and I have not reported any Issue 19 results as verified here.

## Work completed (this branch)
- Added `docs/issues.md`: the permanent issue/PR handoff rule (`docs/notes.md` is overwritten, never appended; required contents listed).
- Added `docs/issues.md` to the required-document list in `CLAUDE.md` section 3.
- Added this `docs/notes.md`.

## Files changed
- `CLAUDE.md`
- `docs/issues.md` (new)
- `docs/notes.md` (new)

## Architectural decisions
- None new. The handoff workflow is process documentation only.

## Functional verification
- None of the Issue 19 functional checks (env detection, invalid-value rejection, missing config errors, production guards, Neon DEV `db:check`, server-only import protection, env unit tests) were run, because the code does not exist on this branch.

## Lint / typecheck / build / test (run on this branch, current state)
- Lint (`eslint` in apps/web): passed, no output.
- Typecheck: `tsc --noEmit` passed for web, `@signalone/shared` and `packages/validation`. The first web run failed with `Cannot find name 'LayoutProps'` because `next typegen` had not run; it passed once `next build` had generated the types.
- Build (`next build` in apps/web): passed.
- Tests: none run. This branch has no test script.
- Note: commands were run via `corepack pnpm --filter ... exec` because `pnpm` is not on PATH for nested package scripts in this runner, so root `pnpm lint/typecheck/build` scripts failed with exit 127 here.

## Not tested, and why
- All Issue 19 behaviours (see above): code absent from this branch.
- Neon connectivity: not run, because the existing `db-check` was not exercised in this task.
- Vercel, Clerk, GitHub Actions: not testable in the runner.

## Unresolved problems / concerns
- The Issue 19 work lives on `claude/issue-19-20261001-0225` and `claude/issue-19-20261001-0226`, and the two implementations differ (`docs/environment.md` vs `docs/environments.md`, `DATABASE_ENV` default vs `APP_ENV` canonical). A human needs to choose one.
- Final Issue 19 validation could not be rerun as requested for the reason above.
- The root `pnpm` scripts fail inside this runner (pnpm not on PATH for nested invocations).

## Recommended next steps
1. Choose which Issue 19 branch to keep, or allow me to fetch it (approve `git fetch`) and merge it into this branch.
2. Then rerun lint, typecheck, build, tests and `db:check`, and overwrite this file with the results.
3. Open the PR for this branch.
