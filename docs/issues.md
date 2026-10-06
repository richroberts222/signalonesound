# Issue / PR Workflow (GitHub-First)

## Rule

GitHub is the source of truth for the live state of an issue and its pull request. Reviewers (Rich, ChatGPT, other humans) inspect the actual issue, the canonical PR branch, commits, diff, code, comments, review threads, and checks directly. Claude does not maintain a duplicate handoff/status report. `docs/notes.md` is **not** mandatory for any issue or PR; see "Recording non-discoverable information" below.

## Canonical branch and pull request

One issue = one canonical feature branch and one pull request (per issue, not repository-wide).

1. The first Claude implementation run for an issue may create the feature branch.
2. Open a PR for that branch as early as practical. Once a PR exists, its branch is the canonical branch for the issue.
3. All further implementation work happens on that PR branch. Claude MUST NOT create another (timestamped or otherwise) implementation branch for the same issue.
4. Further `@claude` implementation requests are made from the PR, not from the original issue (an issue-triggered run starts a new branch).

### How the canonical branch is established and remembered (phone-only workflow)

Repository/service facts (verified in Issue #64):

* `claude-code-action` (Claude GitHub App integration) decides the branch from the **trigger event**, not from any memory of earlier runs. An `issues` event (opened/assigned, or an `@claude` comment on an Issue) always creates a **new** generated branch (`claude/issue-<n>-<timestamp>`). A `pull_request_review_comment`, `pull_request_review`, or `issue_comment` on an **open PR** checks out and pushes to that PR's head branch. This is behavior of the external action, not something this repository can configure; there is no setting that makes an Issue-triggered run reuse an earlier branch.
* The "remembered" canonical branch is therefore **the head branch of the open PR**. GitHub itself is the memory.
* The push helper (`git-push.sh origin <ref>`) accepts only `origin <ref>` with no flags (so no force-push); the action grants it for the branch of the current run only.

Rules:

1. The first Issue-triggered run creates the branch. Open the PR (use the "Create a PR" link in Claude's comment) before any follow-up.
2. **Every follow-up goes through the PR, never the Issue.** Tag `@claude` in a PR conversation comment (or a PR review / review comment). Do not write "continue Issue #N" on the Issue: that creates a second branch.
3. Fixes for failing CI, Claude Review findings, or Rich's review feedback: comment `@claude` on the PR (for example, "@claude CI is failing, fix it on this branch" or "@claude merge latest main into this branch and resolve conflicts"). Claude reads CI results (`actions: read`) and pushes to the PR head branch; the push re-triggers the `pull_request` CI automatically.
4. If a stray second branch was already created, comment `@claude` on the PR asking it to bring over the work with `git cherry-pick` (allowed), rather than merging branches locally.

### Parallel work across issues

"One issue / one PR" applies **per issue**. It is not a repository-wide prohibition on independent work.

* Multiple independent issues MAY proceed in parallel, each with its own canonical branch and PR, when their scopes and files do not create unsafe overlap or dependency conflicts.
* Avoid overlapping changes when practical. Before starting, compare the files/areas each issue will touch (including shared docs, shared contracts, schema/migrations, and lockfiles).
* Work that depends on another open issue's output, or that would edit the same files or contracts, stays sequential: start it after the other PR is merged (or branch the dependency explicitly with Rich's approval).
* A docs/governance-only issue may run alongside a feature issue only when it does not modify that feature's files. If a file is already being modified by another open issue/PR, stop and report the overlap instead of creating a conflict.
* Claude never starts the next slice on its own; it may recommend one. Parallelism does not relax any other rule (CI, review, security, protected `main`, human-only merge).

### ChatGPT / orchestrator rule

This section governs ChatGPT (or any orchestrator) coordinating work. It does not grant Claude any merge authority; Claude never merges (see "Pull request safety" and `/docs/git-workflow.md`).

* **Live state first.** Before deciding what work to start, review, sequence, or merge, inspect the live GitHub/repository state (issues, branches, PRs, commits/diff/code, comments, review threads, checks, current `main`). Memory is navigation/context only and never overrides live repository truth.
* **Parallel only when verified independent.** Coordinate multiple issues in parallel only after verifying their scopes do not create unsafe file/code overlap, dependency conflicts, schema/contract conflicts, or sequencing dependencies.
* **Least risk.** Prefer the most efficient approach with the least risk. If independence is uncertain, keep the work sequential.
* **Parallel development is allowed; integration into `main` is serialized.** Do not merge multiple PRs concurrently.
* **Before each merge,** re-check the live PR, current `main`, merge/conflict state, relevant reviews and threads, and required validation/checks.
* **After a merge,** any other open PR that could be materially affected by the new `main` must be updated (see "Incorporating main") and revalidated before it is eligible to merge.
* Merging remains a human decision and action; this rule only defines the checks that precede it.

### Incorporating main

Run on the PR head branch: `git fetch origin main`, then `git merge origin/main` (merge, not rebase; no history rewrite), resolve ordinary conflicts by editing files, `git add`, `git commit`, push with the helper. Never discard existing work to resolve a conflict; if a conflict is not clearly resolvable, stop and report. This needs `git merge` in the workflow allow-list (see Workflow configuration constraints).

### Validation in the Claude job

GitHub Actions CI on the pushed commit is authoritative. Claude runs `pnpm`/`npx` checks when the job can; if the sandbox prevents it, Claude states that in its comment and relies on CI. This must not block the push.

### Branch safety check (before modifying files in continued work)

Verify, using the permitted read-only Git commands (`git status`, `git branch`, `git log`, `git fetch`):

* current branch
* expected canonical branch (the PR's head branch)
* relevant issue/PR
* required repository history is available (the workflow checks out with `fetch-depth: 0`)

If these do not agree, or continuity cannot be verified, STOP before modifying any file, do not create a replacement branch, do not silently continue elsewhere, and report the exact blocker.

### Fail fast

Infrastructure, permission, history, or branch-state failures must fail fast. Do not repeatedly retry a blocked Git operation. Stop and report the exact blocker.

### Pull request safety

Claude never merges the PR. The human is the final merge gate.

## Normal lifecycle

```text
Plan issue
  -> create GitHub Issue
  -> initial Claude implementation creates branch
  -> open PR
  -> PR branch becomes canonical workspace
  -> subsequent Claude work occurs on the PR
  -> implementation and functional verification
  -> human/ChatGPT review of live GitHub state (issue, PR, diff, comments, checks)
  -> human merges PR
```

## Workflow configuration constraints

`.github/workflows/claude.yml` must keep: `fetch-depth: 0`; the tool allow-list (`gh pr *`, `pnpm`/`npx`/`corepack`, and `git fetch|branch|log|show|diff|checkout|cherry-pick|add|commit|status|merge|merge-base`); and the existing GitHub permissions. `git merge` and `git merge-base` are permitted only so Claude can merge `origin/main` into the canonical issue branch (local operation; publishing still goes through the no-flag push helper). Do not broaden to unrestricted `git`, and do not add `git push`, force-push, destructive reset, rebase, branch/tag deletion, or PR-merge (`gh pr merge`) permissions. Merging a PR into `main` remains human-only; `main` should also be protected on GitHub (see `/docs/security.md`). The Claude GitHub App cannot edit workflow files, so workflow changes are made by the human.

## Recording non-discoverable information

Do not duplicate what GitHub already shows (issue/PR numbers, branch, commits, changed files, diff, CI results, review threads). Claude records only information that cannot reasonably be discovered from GitHub artifacts:

* intentional omissions or deferred requirements;
* unresolved product questions;
* environment limitations, or verification that could not be performed (and why);
* precise manual/visual testing instructions when human judgment is required (where to go, prerequisites, exact actions, expected result, edge cases; see `/docs/product-development.md` section 8);
* reusable lessons/rules that need deliberate follow-up.

Where to record it:

1. Preferably in the relevant issue/PR conversation (Claude's comment or PR description).
2. In permanent `/docs` documentation when the information is truly durable (architecture, environment, database, auth, feature specs). Permanent knowledge belongs there, not in a status file.
3. `docs/notes.md` is optional. Use it only when the above are not suitable, and then it is overwritten (never appended) with only the non-discoverable items, never a status log. Do not create or update it merely to restate GitHub state.

Never put secrets or credential-shaped values in any of these (`/CLAUDE.md` section 18).

## Accuracy

* Report only what was actually run on this branch. Do not carry over results from other branches or earlier runs.
* If something is missing from the branch or could not be run, say so explicitly in the PR/issue conversation.
* Report test/lint/typecheck/build results accurately (exact commands and real outcomes); never claim CI passed unless it ran.
