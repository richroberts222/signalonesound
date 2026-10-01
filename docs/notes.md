# Handoff notes: Issue 55 (Document Signal One Foundation V1 Baseline)

* Issue: #55 "Document Signal One Foundation V1 Baseline". PR: none yet.
* Canonical branch: `claude/issue-55-20261001-2108` (base `main`).
* Latest commit: see `git log` on the branch (this notes file is part of it).

## Work completed

Added section 23, "Foundation V1 Baseline Tag", to `docs/git-workflow.md` (the existing Git documentation). It states that `signal-one-foundation-v1` is the immutable baseline; must not be moved, recreated, overwritten, force-updated, or deleted; is a permanent restore/reference point; that `main` remains the current approved state; that product development continues via issue branches and reviewed PRs; and that rejected work is abandoned or reverted through normal Git workflow. The former section 23 "Guiding Principle" is renumbered to 24.

## Files changed

* `docs/git-workflow.md`
* `docs/notes.md`

## Architectural decisions

None. No new architecture or tooling.

## Verification

* Read-only review of the edited text against the issue's six bullet points.
* No lint, typecheck, test, or build was run: only Markdown documentation changed.
* I did not verify that the tag exists in the remote (the tag-listing command required approval that was not granted).

## Unresolved concerns

Tag immutability is documented only; it is not enforced. Enforcement would need a GitHub tag protection rule or ruleset, which the issue excluded.

## Next steps

Human review and merge of the PR. Optionally add a GitHub tag ruleset to enforce the rule.
