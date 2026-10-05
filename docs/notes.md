# Notes: Issue #60, Establish Signal One Sound Product Development System

## Current work

* Issue: #60, "Establish Signal One Sound Product Development System".
* PR: created after push (link in the issue #60 comment).
* Canonical branch: `claude/issue-60-20261005-0646` (base `main`).
* Latest commit: see `git log` on the branch.
* Scope: documentation/rules only. No application, DB, auth, API, mobile, env, or workflow changes. `signal-one-foundation-v1` untouched. No PROD access.

## BLOCKER / DISCREPANCY: product plan not supplied

* Instruction assumed: Rich's Signal One Sound product plan is available to translate into `/docs/product/product-plan.md`.
* Repository/issue actually contain: no plan text (issue body has none, no comments/attachments, no "ROCK"/"ROCK SOS" text anywhere in the repo).
* Why it matters: the issue forbids inventing or silently filling product requirements.
* Resolution taken: `product-plan.md` is a clearly labeled PENDING SOURCE scaffold with the tiered structure and normalization rule, but **no product content**. Rich must supply the plan (paste into the PR/issue); a follow-up run then populates the minimum/startup, later Phase 1, Phase 2+, long-term, and UNDECIDED sections. This PR should not be treated as complete for issue section 15 until then.

## Documents created

* `docs/product-development.md`: the system (authority, pipeline, mock-first, DB design checkpoint, testing layers, reset/seed use, manual testing, Definition of Done, drift, handoff).
* `docs/naming-conventions.md`: product name, identifier distinctions, domain terms (all UNDECIDED).
* `docs/product/product-plan.md` (pending scaffold), `docs/product/roadmap.md` (no slices approved), `docs/features/README.md` (spec guidance).

## Documents modified

* `CLAUDE.md`: new doc references in section 3, new concise section "19. Product Development System" (routing rules); former "Final Rule" renumbered to 20.
* `docs/issues.md`: notes.md required contents extended with the issue's handoff sections.
* `docs/notes.md`: overwritten (this file).

## Existing rules reused (not duplicated)

Test Value Review and `docs/automation/*` (layers linked, not restated); `docs/database.md` sections 6, 10, 12, 22 and the `db:reset|seed|refresh --env=dev|qa` tooling; one-issue/one-branch/PR and never-merge rules in `docs/issues.md`; secrets rule (no URLs or credentials added); `docs/ideas` "not authorization" principle.

## Conflicts / duplication / discoveries

* Repo brand is "Signal One"/`signalone` (package `signalone`, `@signalone/*`, Expo name, README, home UI), not "Signal One Sound". Documented as historical in `naming-conventions.md`; nothing renamed. UI copy still says "Signal One"; changing it is a separate approved slice.
* No domain terms are defined anywhere in docs, so all ten are UNDECIDED.
* Workflow notes: `docs/boilerplate*.md` and `docs/customization-map.md` describe the template-era naming; left unchanged as historical.

## Decisions made

* Pending scaffold rather than inferring a plan (see blocker).
* Process content lives in one new doc; CLAUDE.md remains a router.
* Product-development doc is "required for product feature work" rather than a global gate.

## Validation performed

* Manual review of cross-references: every path referenced from CLAUDE.md and the new docs exists in the branch (docs listed above plus existing automation/database/issues docs).
* Checked for no real or credential-shaped URLs/secrets in new content.
* No automated tests, lint, typecheck, or build were run: docs-only change, no code touched, and per Test Value Review no tests are justified. CI will run its normal checks.

## Not tested

* Markdown rendering and links were not checked with a tool.
* `docs/testing.md` and `docs/git-workflow.md` were not edited; I did not audit them for wording that conflicts with the new "Vercel Preview before merge" rule.

## Unresolved questions for Rich

1. Please supply the product plan (see blocker).
2. Definitions for the UNDECIDED domain terms (Event, Revival, Church, Ministry, Church/Ministry, Organizer, Speaker, Revival Type, Gathering, Venue) when needed by a feature.
3. When should user-facing "Signal One" copy (home UI, Expo display name) change to "Signal One Sound"?

## Recommended next step (recommendation only)

Supply the product plan, then run a follow-up on this PR to populate `product-plan.md` and seed the roadmap. After merge, the first feature slice should be chosen by Rich from the minimum/startup tier.
