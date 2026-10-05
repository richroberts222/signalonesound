# Issue / PR Handoff Workflow

## Rule

Whenever Claude works on a GitHub issue or pull request, Claude MUST maintain `docs/notes.md` on the current feature branch as the authoritative current handoff/status report for that branch.

## Canonical branch and pull request

One issue = one canonical feature branch and one pull request.

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
  -> overwrite docs/notes.md
  -> human/ChatGPT review
  -> human merges PR
```

## Workflow configuration constraints

`.github/workflows/claude.yml` must keep: `fetch-depth: 0`; the tool allow-list (`gh pr *`, `pnpm`/`npx`/`corepack`, and `git fetch|branch|log|show|diff|checkout|cherry-pick|add|commit|status|merge|merge-base`); and the existing GitHub permissions. `git merge` and `git merge-base` are permitted only so Claude can merge `origin/main` into the canonical issue branch (local operation; publishing still goes through the no-flag push helper). Do not broaden to unrestricted `git`, and do not add `git push`, force-push, destructive reset, rebase, branch/tag deletion, or PR-merge (`gh pr merge`) permissions. Merging a PR into `main` remains human-only; `main` should also be protected on GitHub (see `/docs/security.md`). The Claude GitHub App cannot edit workflow files, so workflow changes are made by the human.

## Overwrite, never append

- `docs/notes.md` MUST be **overwritten**, not appended to, whenever Claude completes work or responds after making changes.
- After each update it contains only the latest complete state of the branch.
- It is not historical documentation. Permanent architectural knowledge belongs in the appropriate `/docs` file (for example `environment`, `database`, `auth`), not in `notes.md`.
- Update `docs/notes.md` before the final commit and push so it is included in the pushed branch.

## Purpose

A reviewer must be able to retrieve one predictable file, `docs/notes.md`, from the public feature branch without copying GitHub comments.

## Required contents

1. Issue number and title.
2. PR number, if one exists.
3. Canonical branch (and base).
4. Latest commit.
5. Work completed.
6. Files changed.
7. Architectural decisions.
8. Functional verification performed.
9. Exact test / lint / typecheck / build results (latest run only).
10. Anything not tested, and why.
11. Unresolved concerns.
12. Recommended next steps (a recommendation only; never implement the next slice without authorization).

### Extended sections (when applicable)

The handoff standard<!-- boilerplate:reference:start --> is in `/docs/product-development.md`; it<!-- boilerplate:reference:end --> requires the following. Include the items that apply:

* **Current work**: issue, title, PR, canonical branch, base branch, latest commit.
* **Product requirements**: feature spec, requirements being implemented, acceptance criteria.
* **Implementation completed**: exact operational behavior.
* **Files changed**: important files, what changed, why.
* **Architecture impact**: UI, API, services/business logic, auth, database/data access, schema/migrations, shared contracts, mobile, external services.
* **Database**: tables, columns, relationships, constraints, migration, reset/seed implications, environment used.
* **Testing / validation**: per test group, what was tested, exact command, result, what remains untested and why.
* **Manual exploratory testing**: exact steps for Rich (where to go, prerequisites, actions, expected result, edge cases, exploratory scenarios).
* **Known issues / unresolved concerns**: incomplete behavior, uncertainty, technical debt, deferred decisions.

`docs/notes.md` must give exact visibility into the current implementation.

## Accuracy

- Report only what was actually run on this branch. Do not carry over results from other branches or earlier runs.
- If something is missing from the branch or could not be run, say so explicitly.
