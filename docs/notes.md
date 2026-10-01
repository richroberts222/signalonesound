# Notes: Issue 21 "harden workflow"

1. Issue: #21 "harden workflow"
2. PR: none yet at time of writing (open one from this branch; further @claude requests should come from that PR).
3. Canonical branch: `claude/issue-21-20261001-0559`, base `main`. Not merged.
4. Latest commit: the commit containing this file (base was `b8eaed7`); see `git log -1` on the branch.

## 5. Work completed

- `docs/issues.md`: added the one-issue/one-branch/one-PR rule, continue-from-PR rule, branch safety check, fail-fast rule, PR safety (no merge), the normal lifecycle, and workflow configuration constraints. Updated required notes.md contents to the 12-item list.
- `docs/git-workflow.md`: added the canonical-branch rule in section 2 and "request further work from the PR" in section 11.
- `docs/environment.md`: recorded the decision that `APP_ENV` and `DATABASE_ENV` stay separate (separation lets unsafe mismatches be detected); removed the "undecided" follow-up.
- `CLAUDE.md` already references `/docs/issues.md` (line 59); no change needed.
- `.github/workflows/claude.yml` was intentionally NOT modified: it already has `fetch-depth: 0`, the required git/pnpm/npx/corepack allow-list, and existing permissions, with no force-push/reset/branch-delete/merge permission. The GitHub App cannot edit workflow files anyway.

## 6. Files changed

`docs/issues.md`, `docs/git-workflow.md`, `docs/environment.md`, `docs/notes.md`.

## 7. Architecture decisions

- One issue = one canonical branch and PR; the PR branch is canonical once it exists.
- `APP_ENV` (runtime) and `DATABASE_ENV` (database) remain separate (recorded in `docs/environment.md`).

## 8. Functional verification performed

- Read the resulting `claude.yml` and confirmed the settings above are intact (file unchanged).
- Confirmed `CLAUDE.md` references `docs/issues.md`.
- Re-read the edited docs for consistency (lifecycle matches `git-workflow.md` sections 11 and 23).

## 9. Test/lint/typecheck/build results

None run: documentation-only change, no application code touched.

## 10. Not tested, and why

- YAML syntax validation: the workflow file is unchanged, and the sandbox did not permit running a YAML parser.
- Actual enforcement: the rules are documented instructions; the workflow cannot technically prevent a new branch from an issue-triggered run.
- No production data was accessed.

## 11. Unresolved concerns

- Issue-triggered runs by design create a new `claude/issue-N-<timestamp>` branch; the PR-first rule relies on the human commenting on the PR.
- Enforcement in the workflow YAML (e.g., a prompt/branch check) would need a human edit of `claude.yml`.

## 12. Recommended next steps

1. Open the PR from this branch and review.
2. Optionally add a branch-continuity instruction to `claude.yml` via a human edit.
3. Human merges when satisfied.
