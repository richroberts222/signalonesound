# Issue / PR Handoff Workflow

## Rule

Whenever Claude works on a GitHub issue or pull request, Claude MUST maintain `docs/notes.md` on the current feature branch as the authoritative current handoff/status report for that branch.

## Canonical branch and pull request

One issue = one canonical feature branch and one pull request.

1. The first Claude implementation run for an issue may create the feature branch.
2. Open a PR for that branch as early as practical. Once a PR exists, its branch is the canonical branch for the issue.
3. All further implementation work happens on that PR branch. Claude MUST NOT create another (timestamped or otherwise) implementation branch for the same issue.
4. Further `@claude` implementation requests are made from the PR, not from the original issue (an issue-triggered run starts a new branch).

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

`.github/workflows/claude.yml` must keep: `fetch-depth: 0`; the tool allow-list (`gh pr *`, `pnpm`/`npx`/`corepack`, and `git fetch|branch|log|show|diff|checkout|cherry-pick|add|commit|status`); and the existing GitHub permissions. Do not broaden to unrestricted `git`, and do not add force-push, destructive reset, branch deletion, or merge permissions. The Claude GitHub App cannot edit workflow files, so workflow changes are made by the human.

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
12. Recommended next steps.

## Accuracy

- Report only what was actually run on this branch. Do not carry over results from other branches or earlier runs.
- If something is missing from the branch or could not be run, say so explicitly.
