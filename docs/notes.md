# Issue 64 Handoff: Enable Phone-Only Claude Development Workflow

* **Issue:** #64 "Enable Phone-Only Claude Development Workflow"
* **PR:** created from the link in the issue comment. Do not merge automatically.
* **Canonical branch:** `claude/issue-64-20261005-1732`; base `main`.
* **Type:** documentation only. No application code, workflow file, schema, or permission was changed in this PR. `signal-one-foundation-v1` untouched.

## Root cause

Facts observed in the repository:

* `.github/workflows/claude.yml` triggers on `issues`, `issue_comment`, `pull_request_review_comment` and `pull_request_review`, and uses `anthropics/claude-code-action@v1`.
* The allow-list in `claude_args` contains `git fetch|branch|log|show|diff|checkout|cherry-pick|add|commit|status`, `gh pr *`, `pnpm`, `npx`, `corepack`. It has **no `git merge`** and no `git push`.
* The action's push helper (`git-push.sh`, read in the runner) accepts only `origin <ref>` with no flags, so it cannot force-push. It accepts any valid ref, but the action only grants it for the branch of the current run.
* `ci.yml` runs on every `pull_request` and on pushes to `main`. Any push to a PR branch reruns it.
* `docs/issues.md` already said follow-ups must come from the PR; this was not followed in #60 and #61, where follow-ups were made from the Issue.

Behavior of the external action (stated by the action's own run instructions; not verifiable from this repository):

* An Issue-triggered run always creates a new generated branch. Nothing in this repository configures that. This is why #60 and #61 got second branches. It cannot be fixed by repository settings.
* A run triggered on an **open PR** pushes to that PR's head branch.

Causes of the specific blockers reported:

| Blocker | Source |
| --- | --- |
| Second generated branch | Claude GitHub App behavior for Issue triggers (external) |
| Merge of main refused | `claude_args` allow-list has no `git merge` (repository fact) |
| Plain `git push <named branch>` refused | No `git push` in allow-list, intentionally; push helper is scoped to the run's branch (repo + action) |
| Not branch protection or Actions permissions | `contents: write` is already granted; branch protection settings were not inspectable from here |

## Files changed

* `docs/issues.md`: new sections "How the canonical branch is established and remembered", "Incorporating main", "Validation in the Claude job"; allow-list constraint now names `git merge` / `git merge-base` and explicitly forbids `git push`, rebase, deletions and `gh pr merge`.
* `docs/git-workflow.md`: section 8 (merge main procedure), section 11 (phone workflow pointer).
* `docs/notes.md`: this file.

## Permissions changed

None in this PR. Claude cannot edit `.github/workflows/*` (GitHub App limitation), so one workflow edit remains for Rich.

## Manual step for Rich (can be done in the GitHub iPhone web UI)

Edit `.github/workflows/claude.yml` on a branch / via PR, and in the `claude_args` allow-list append, inside the quoted list:

`,Bash(git merge:*),Bash(git merge-base:*)`

Resulting tail: `...Bash(git commit:*),Bash(git status:*),Bash(git merge:*),Bash(git merge-base:*)"`

Why it is safe: `git merge` only changes the local checkout of the run's branch. Publishing still goes only through the no-flag push helper for the run's branch. `git push`, rebase, reset, branch/tag deletion and `gh pr merge` remain disallowed. Until this edit is merged, Claude can still fetch, commit, resolve conflicts and push fixes to a PR branch, but cannot merge `main` into it; the fallback is the GitHub "Update branch" button on the PR (works on iPhone).

Optional hardening (not verified, repository settings were not visible to me): enable a branch ruleset on `main` requiring the PR and CI, and protect tag `signal-one-foundation-v1` with a tag ruleset.

## Canonical branch behavior

The first Issue run creates the branch; the PR head branch is then canonical. All later work is requested by `@claude` on the PR. The Issue must not be used for follow-ups. GitHub cannot be made to reuse a branch for Issue-triggered runs, so the PR is the GitHub-native alternative.

## Recommended iPhone workflow

1. Create the Issue with `@claude`. Claude pushes a branch and posts a "Create a PR" link; tap it and create the PR.
2. CI, Claude Review and Vercel run on the PR.
3. For failures or feedback, comment on the **PR**: `@claude CI is failing; fix it on this branch.` (or a review comment / review with `@claude`).
4. Claude pushes to the PR head branch; CI reruns automatically.
5. Branch behind main: "Update branch" button, or (after the manual step above) `@claude merge latest main into this branch`.
6. Rich merges the PR manually.

## Validation performed

* Read `claude.yml`, `claude-code-review.yml`, `ci.yml`, the push helper script, and the docs listed above.
* No pnpm/lint/test run: docs-only change.
* **Not tested:** the end-to-end acceptance test (follow-up `@claude` on this PR pushes to the same head branch and CI reruns). It can only occur after this PR exists. Suggested test: after opening the PR, comment `@claude add one line saying "verified" to the end of docs/notes.md`; confirm the commit lands on this branch, CI reruns, and `main` is unchanged.

## Is the phone-only workflow operational?

Largely, but not fully confirmed:

* Fix-on-PR cycle: expected to work as is (PR-triggered runs push to the PR head; CI reruns). Needs the acceptance test above.
* Merging main by Claude: **not operational** until the `git merge` allow-list edit is applied; the "Update branch" button is the interim.
* Reuse of branch from Issue triggers: **impossible** by service design; mitigated by the PR rule.

## Unresolved limitations

* Whether pushes by the Claude app re-trigger CI was not tested here (the action pushes with an app token, which normally does; unverified).
* Branch protection / rulesets not inspected.
* Conflicts that need judgment still stop Claude and require a human decision.

verified
