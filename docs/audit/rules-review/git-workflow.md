# Rules review 1: `docs/git-workflow.md`

Reviewed 2026-10-09 against the live repository, GitHub settings (read with `gh api`) and the local Claude Code settings. Authority class for industry practice: established engineering practice, not re-fetched.

Verdict key: **Sound** (correct) · **Fixed** (wrong or contradictory, corrected in this pull request) · **Enforced** (a mechanism exists) · **Guidance** (judgment rule; no mechanism is appropriate) · **Gap** (worth enforcing; proposal below) · **Owner** (needs the owner's decision or a GitHub setting).

| § | Rule | Correct? | Enforced by | Verdict |
| --- | --- | --- | --- | --- |
| 1 | `main` protected; no direct commit, push, force-push, bypass | Yes | Ruleset "Protect main": pull request required, `Validate` required, force-push and deletion blocked, no bypass (RUN, `gh api rulesets/24677009`) | Sound, Enforced |
| 1 | Claude does not merge into `main` | **Contradicted** the paragraph below it (owner-authorized merge) | The permission prompt in Claude Code (RUN: a merge was blocked when authorization was unclear) and the ruleset | **Fixed**: bullet now says "without the human developer's explicit authorization" |
| 1 | Claude does not approve its own PRs | Yes | Moot: required approvals is 0 and a PR author cannot approve their own | Sound, Guidance |
| 2 | Work on a dedicated branch from `main` | Yes | Ruleset blocks direct pushes to `main` | Sound, Enforced |
| 2 | Branch name references the issue | Vague ("or another convention"); the example `claude/issue-12-...` is only the GitHub Action's pattern, not what is used | None | **Fixed**: documents `<type>/issue-<n>-<slug>`. Not enforced: a naming check would cost more than it protects (one owner) |
| 2 | One issue = one branch = one PR; stop and report if branch and issue disagree | Yes | None (procedural) | Sound, Guidance |
| 3 | One logical change per branch | Yes | None; reviewed by the human | Sound, Guidance |
| 4 | Inspect Git state before editing; do not overwrite user changes | Yes | None | Sound, Guidance |
| 5 | Clean tree; no secrets or local env files committed | Yes | Secrets: `security.test.ts` in `Validate`; `.gitignore` ignores `.env*` | Sound, Enforced (secrets); Guidance (the rest) |
| 6 | Specific commit messages; none like "updates", "fix" | Rule is right but gave no format | None | **Fixed**: documents `<type>: <subject> (#<issue>)`, matches the last 12 commits. Not enforced (commit-lint tooling is disproportionate here) |
| 7 | Commits are logical stages, not noise | Yes | None | Sound, Guidance |
| 8 | Update the branch with `git merge origin/main`; never rebase or force-push | Yes. "The push helper" exists only in the GitHub Action, not in local Claude Code | Workflow allow-list grants `git merge`; force-push is not allowed there | **Fixed**: now says plain `git push` of the current branch locally |
| 9 | Push at logical stages | Yes | None | Sound, Guidance |
| 10 | PR states what, why, validation, limits | Yes | None. No pull request template exists (planned: F-DEVOS-010) | Sound; **Gap**, tracked as Wave 1 item 4 |
| 11 | Claude stops at the PR | Consistent with §1 ("automatically") | As §1 | Sound |
| 12 | Review changes go on the same branch | Yes | None | Sound, Guidance |
| 13 | Vercel Preview is part of review; a green deploy is not approval | Yes | Vercel check on each PR | Sound, Enforced (preview exists), Guidance (review) |
| 14 | Branch stays usable locally | Yes | None | Sound, Guidance |
| 15 | Run validation before opening or updating a PR; do not weaken it to pass | Yes | `Validate` is required by the ruleset. Weakening a test is not mechanically blocked | Sound, Enforced (run), Guidance (no weakening) |
| 16 | No destructive Git commands (`reset --hard`, `clean -fd`, `checkout -- .`) | Yes | **Nothing mechanical**: the local Claude Code settings list allowed commands but no deny list (READ, `.claude/settings.json`) | **Gap**: add deny rules (proposal below) |
| 17 | Branch cleanup is careful | Yes | None | Sound, Guidance |
| 18 | Never force-push `main`; avoid rewriting shared history | Yes | `main`: ruleset blocks force-push. Other branches: allowed (acceptable) | Sound, Enforced for `main` |
| 19 | Reference the issue in branch, commit or PR | Yes | None | Sound, Guidance |
| 20 | "Claude has no merge authority" | **Contradicted** §1 | As §1 | **Fixed**: "no merge authority of its own"; may merge only on explicit authorization as defined in §1 |
| 21 | `/commit` command rules | The command is not defined anywhere in this repository | None | **Fixed**: now conditional ("if available") |
| 22 | Completion checklist (committed, pushed, validated, PR, no merge) | Yes | None | Sound, Guidance |
| 23 | Foundation tag is immutable | Yes | **None**: no tag ruleset exists, only the branch ruleset (RUN, `gh api rulesets`) | **Gap / Owner**: see proposal 2; note added in the document |
| 24 | Guiding principle and the Issue → ... → Human Merge flow | Omitted the authorized-merge path | N/A | **Fixed** |

## Proposals that need the owner (not applied here)

1. **Mechanical guard for destructive Git commands (§16, §18).** Add a committed `deny` list to the Claude Code project settings for `git reset --hard`, `git clean`, `git push --force`, `git push -f` and `git branch -D`, so the rule is enforced by the tool and not only by Claude's compliance. Today `.claude/settings.json` exists only on the owner's machine (it is untracked, by an earlier decision). Committing a shared settings file is the owner's call: it would apply to every contributor and to a generated application.
2. **Protect the foundation tag (§23).** Add a GitHub tag ruleset for `signal-one-foundation-v1` that blocks update and deletion (repository settings; an owner action or a one-line API call if the owner authorizes repository-setting changes).
3. **Pull request template (§10).** Planned already (F-DEVOS-010); it would make "what, why, validation, limits" a checklist rather than a habit.

Not recommended: commit-message linting, branch-name enforcement, signed commits. With one owner and one reviewer they add friction without reducing a risk the audit found.
