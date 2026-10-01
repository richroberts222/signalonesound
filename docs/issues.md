# Issue / PR Handoff Workflow

## Rule

Whenever Claude works on a GitHub issue or pull request, Claude MUST maintain `docs/notes.md` on the current feature branch as the authoritative current handoff/status report for that branch.

## Overwrite, never append

- `docs/notes.md` MUST be **overwritten**, not appended to, whenever Claude completes work or responds after making changes.
- After each update it contains only the latest complete state of the branch.
- It is not historical documentation. Permanent architectural knowledge belongs in the appropriate `/docs` file (for example `environment`, `database`, `auth`), not in `notes.md`.
- Update `docs/notes.md` before the final commit and push so it is included in the pushed branch.

## Purpose

A reviewer must be able to retrieve one predictable file, `docs/notes.md`, from the public feature branch without copying GitHub comments.

## Required contents

1. Issue / PR and branch identification (number, title, branch, base).
2. Work completed.
3. Files changed.
4. Architectural decisions.
5. Functional verification performed and results.
6. Lint / typecheck / build / test results (actual results from the latest run only).
7. Anything not tested, and why.
8. Unresolved problems or concerns.
9. Recommended next steps.

## Accuracy

- Report only what was actually run on this branch. Do not carry over results from other branches or earlier runs.
- If something is missing from the branch or could not be run, say so explicitly.
