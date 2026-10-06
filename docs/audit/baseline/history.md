# Baseline: Process History (Pass 1)

Facts about how the development operating system has actually behaved, from git and the GitHub API, at baseline `31ec6ba` on 2026-10-06. No judgments; findings are drawn in Pass 2 (DEVOS, SEC, REL). Commands are given so that any number can be reproduced.

## Repository timeline

| Fact | Value | How |
| --- | --- | --- |
| First commit | 2026-09-28 | `git log --reverse` |
| Commits on `main` | 122 reachable commits, 50 first-parent | `git rev-list --count main`, `git log --first-parent` |
| Foundation tag | `signal-one-foundation-v1` at `06e7336` (2026-10-01, PR #54 merge) | `git tag`, `git log -1` |
| CI workflow created | 2026-10-01 (`14fc08a`, "Create ci.yml", a direct commit to `main` during the PR #31 period) | `git log --diff-filter=A -- .github/workflows/ci.yml` |
| Claude workflow edits | 7 commits to `claude.yml`, all direct to `main` by the human (the GitHub App cannot edit workflows) | `git log -- .github/workflows/claude.yml` |

## Pull requests

| Metric | Value | How |
| --- | --- | --- |
| Merged PRs | 38 | `gh pr list --state merged` |
| Closed without merge | 1 (#30 "Add logging and error-handling foundation") | `gh pr list --state closed` |
| Merged by | richroberts222 for all 38 | `--json mergedBy` |
| PR authors | richroberts222 (36), the Claude GitHub App (2: #10, #59) | `--json author` |
| PRs with any submitted review | 0 of 38 | `--json reviews` |
| Time from PR open to merge | median 5 minutes; 16 PRs merged within 2 minutes; max 4,859 minutes (#58, the UI concept later reverted) | `--json createdAt,mergedAt` |
| Reverts | 1: PR #58 (fire/gold home concept) reverted by PR #59 four days later | `git log --grep Revert` |

Claude Code Review (the `/code-review --comment` workflow) ran successfully on 31 PRs, yet the five most recent merged PRs (#67, #69, #73, #75, #77) carry 0 inline review comments and 0 reviews (`gh api repos/<r>/pulls/<n>/comments` and `/reviews`), and PR #80's only comment is the Vercel bot. The workflow's output, if any, is not visible on the PRs it reviewed.

## Direct commits to `main` (not through a PR)

12 first-parent commits on `main` are not PR merges. All are by the human: initial setup (2026-09-28, 5 commits), workflow edits (`claude.yml` 4 times, `claude-code-review.yml` once, 2026-09-30 to 2026-10-01), "updated db rules" (2026-09-30), and "updated ui.md with fire design requirements" (`98da759`, 2026-10-05). Command: `git log --first-parent main --format='%h %cs %s' | grep -viE "merge pull request|\(#[0-9]+\)"`.

## Branches

| Metric | Value |
| --- | --- |
| Remote branches | 50 (`git branch -r`), none deleted after merge (`delete_branch_on_merge: false`) |
| Branches per issue | issue 19: 5; issues 11, 60, 61, 64: 2 each; all others 1 |
| Local stale branches on the audit machine | 5 `claude/issue-*` branches, all merged |

The action creates a new `claude/issue-<n>-<timestamp>` branch for every Issue-triggered run (`docs/issues.md` records this as external behavior); the multi-branch issues are the ones where a follow-up was requested from the Issue rather than the PR.

## CI and checks

Workflow run conclusions (last 200 runs, `gh run list --limit 200 --json name,conclusion`):

| Workflow | success | failure | skipped |
| --- | --- | --- | --- |
| CI | 44 | 14 | 0 |
| Claude Code Review | 31 | 3 | 0 |
| Claude Code | 41 | 0 | 67 (the `if:` filter on comments without `@claude`) |

Check runs on each PR's merge commit (`gh api repos/<owner>/<repo>/commits/<sha>/check-runs`):

| Outcome | PRs |
| --- | --- |
| `Validate` succeeded on the merge commit | #80, #77, #75, #73, #72, #69, #65, #63, #62, #54, #52, #50, #48, #46, #45, #42, #41, #39, #31 (19) |
| `Validate` **failed** on the merge commit | #59, #58, #56, #40, #34, #33, #32 (7) |
| `Validate` cancelled | #67 (1) |
| No `Validate` check (before CI existed) | #29, #22, #20, #18, #14, #12, #10, #7, #5, #3, #1 (11) |

Seven PRs were merged while the CI check on the resulting commit was failing. Nothing prevented this: `main` has no branch protection or ruleset (see `external-state.md`). The `CI | failure` count of 14 includes PR runs and pushes to `main`.

## Issues

| Metric | Value |
| --- | --- |
| Issues (all states) | 41 |
| Open issues at baseline | 0 |
| Issue to PR relationship | one PR per issue in every case except #58/#59 (concept and its revert); several issues have more than one branch (above) |

## Documentation change dates

Last substantive change per doc (`git log -1 --format=%cs -- <file>`): `routing.md` and `server-components.md` 2026-09-28 (empty since creation); `architecture-rules.md`, `data-fetching.md`, `data-mutations.md`, `boilerplate-references-report.md` 2026-09-30; most foundation docs 2026-10-01; product, UI, testing, workflow docs 2026-10-05; `auth.md`, `web.md`, `notes.md`, `roadmap.md`, the charter 2026-10-06.

## Boilerplate export

The published `richroberts222/fullstack-boilerplate` has a single commit (2026-10-01) and is not flagged as a template repository. A fresh export at the baseline differs from it in 52 paths (27 changed files, 24 paths only in the fresh export, 1 only in the published copy); detail in `inventory.md`.
