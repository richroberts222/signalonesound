# Handoff Notes

## Issue / PR

- Request: revert PR #58 ("Add first Signal One fire/gold home UI concept"), which closed issue #57. The UI was merged by accident and is not wanted on `main`.
- Revert PR: created from this branch (number assigned on creation). It is NOT merged. The human is the merge gate.

## Branch and base

- Canonical branch: `claude/pr-58-20261005-0636`
- Base: `main` at `4ea8c01` (merge commit of PR #58)
- Tag `signal-one-foundation-v1`: not touched. No history rewrite, no force-push, no reset of `main`.

## Commits

- Base: `4ea8c01` Merge pull request #58 (merge of `a04b24a`, whose first parent is `28c1ea1`)
- One revert commit on this branch (see `git log`). The PR #58 changes were undone by restoring the pre-#58 tree (`28c1ea1`) rather than running `git revert`, because `git revert` is not in the workflow's allowed Git commands. The result is the same as `git revert -m 1 4ea8c01`, but the commit message was written by hand.

## Files reverted

Restored to their state at `28c1ea1`:

- `apps/web/app/globals.css`
- `apps/web/app/page.tsx`
- `docs/notes.md` (replaced by this file)

Removed (added by PR #58):

- `apps/web/components/home/hero.tsx`
- `apps/web/components/home/mock-data.ts`
- `apps/web/components/home/revival-finder.tsx`
- `apps/web/components/ui/badge.tsx`
- `apps/web/components/ui/input.tsx`

Check: `git diff 28c1ea1` on the working tree shows no differences outside `docs/notes.md`.

## Validation performed

Ran on this branch after the revert. `pnpm` was not on PATH, so commands were run through `corepack pnpm`:

- `pnpm install --frozen-lockfile`: passed
- `pnpm -r --if-present lint` (mobile, web): passed
- `pnpm -r --if-present typecheck` (validation, web, mobile): passed
- `pnpm -r --if-present test`: mobile 10/10 passed; web 13 files, 124/124 passed
- `pnpm -r --if-present build`: web Next.js build completed, routes listed

## Not tested

- `pnpm test:boilerplate` (`node --test scripts/boilerplate/boilerplate.test.mjs`): not run. `node` is not on the workflow's Bash allow-list, so the command needed approval that was not available.
- Other `pnpm validate` steps run through `corepack pnpm -r` rather than the root scripts, because the root scripts call `pnpm` directly and it is not on PATH here.
- Visual check of `/` in a browser and the Vercel preview: not done.
- Sign-in, API, and database flows: not exercised beyond the existing unit tests.

## Unresolved concerns

- The `docs/notes.md` that PR #58 added described the concept UI. It is overwritten here, so no trace of it remains outside Git history. The UI work stays in Git history (`a04b24a`) if it is wanted later.
- Issue #57 was closed by PR #58. It is not reopened by this revert. Reopen it manually if the work should be tracked again.
- Run `pnpm test:boilerplate` locally or in CI before merging.

## Recommended next steps

1. Review the revert PR diff against `28c1ea1`.
2. Confirm CI and the Vercel preview are green.
3. Merge the revert PR manually.
