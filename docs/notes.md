# Notes: Issue #60, Establish Signal One Sound Product Development System

## Current work

* Issue: #60, "Establish Signal One Sound Product Development System".
* PR: not yet created at time of writing; a prefilled "Create a PR" link is in the issue #60 comment. Do not merge automatically.
* Canonical branch: `claude/issue-60-20261005-0646` (base `main`; brought up to date after PR #59). The work was pushed to that branch.
* Latest commit: see `git log` on the canonical branch (the commit that adds this file).
* Scope: documentation/rules only. No application, DB schema, migrations, API, auth, mobile, env, external-service, or workflow changes. `signal-one-foundation-v1` untouched. No PROD access.

## Source product plan used

`/docs/product/source-product-plan.md` (403 lines), read in full. It is preserved unchanged as the authoritative source.

## Documents created (whole issue)

* `docs/product-development.md`, `docs/naming-conventions.md`, `docs/product/roadmap.md`, `docs/features/README.md` (earlier run).
* `docs/product/product-plan.md`: populated in this run (was a pending scaffold).

## Documents modified (this run)

* `docs/product/product-plan.md`: full repository-native plan with lettered tiers: A Minimum/Startup; B Later Phase 1; C Community Optional (Phase 1 or 2, undecided); D Phase 1 revenue; E Phase 2; F Phase 3; G Phase 4; H Phase 5; I Additional revenue streams; J Long-term vision; K consolidated index of 10 undecided/vote items. Each future tier states it is not authorized.
* `docs/naming-conventions.md`: domain terms revisited (see below); removed stale reference to the reverted home UI.
* `docs/product-development.md`: authority table cites the source plan; tier wording lists exactly what is not authorized.
* `docs/product/roadmap.md`: corrected stale baseline entry (Issue #57 UI was reverted by PR #59).
* `docs/testing.md`: two wording fixes (see audit).
* `docs/git-workflow.md`: one paragraph added to Vercel Preview section.
* `CLAUDE.md`: one line noting the preserved source plan.
* `docs/notes.md`: overwritten.

## Product authority established

* `product-plan.md` = direction only; `source-product-plan.md` = preserved source; roadmap = sequencing; `docs/features/` specs + approved issue = authorization.
* Only section A (Minimum/Startup) describes current targets, and still only via an approved issue.
* Legacy ROCK / ROCK SOS normalized to Signal One Sound. One legacy slogan, "Prayed on the ROCK, 1 Sam 2:2" (Phase 2), is retained verbatim exactly as the source flags it as unresolved branding.
* Source ambiguities preserved, not resolved: flyer upload "??" and livestream links "??" (startup), the startup list containing both "Free member/user accounts" and "Free monthly member/user accounts", the radius value "X", pricing votes, 300-character comment vote, flagship-50 vote, Phase 1 vs 2 placement of community features, testimony 30-day retention.

## Naming decisions

* Resolved only where the source supports it: Event (basic), Revival Type (the 12 listed values; multi-tag), Church/Ministry (portal account holder), Speaker (person on an Event; optional profile).
* Partial: Venue ("Venue Name" is an address component; Venue as an entity is undecided).
* Still UNDECIDED: Revival (relationship to Event), Church (standalone), Ministry (standalone), Organizer (not in source), Gathering (only appears in later-phase names and "Prayer gatherings").
* Official name Signal One Sound; slug `signal-one-sound`; repository identifier `signalonesound`. No technical identifier renamed. User-facing "Signal One" copy change is out of scope (separate approved application slice).

## Documentation audited and conflicts

* `docs/testing.md`: "Every feature has ... derived tests" and "New shared logic ... ships with tests in the same PR" could be read as mandating tests regardless of Test Value Review. Resolved by qualifying both with the Test Value Review and linking `product-development.md`; no layer is mandated for every feature.
* `docs/git-workflow.md`: section 13 said a Preview "may be used" for review. That is compatible for ordinary PRs but did not state the exploratory rule. Resolved by adding that exploratory UI/features must be reviewed by Rich in a Vercel Preview before merge and must not be merged just to get a Preview. Sections 12 and 20 (human reviews Preview, human merges, Claude has no merge authority) already agree; unchanged.
* Stale-reference defect found and fixed: roadmap and naming docs described the Issue #57 home UI as present; PR #59 reverted it.
* Product development doc checked against the source plan: no requirement conflicts found; nothing in it assumed plan content.

## Branch note

The session started on a different local branch (`claude/issue-60-20261005-1549`, equal to `main`). I loaded the canonical branch's files and am pushing to the canonical branch as instructed, not creating a new implementation branch.

## Validation performed

* Verified every `/docs/...` path referenced from CLAUDE.md and the new/edited docs exists.
* Checked content for no secrets or credential-shaped URLs.
* Compared product-plan.md section by section with the source.
* No lint, typecheck, build, or tests were run: docs-only, no code touched, and the Test Value Review justifies none. CI runs its normal checks on the PR.

## Not tested

* Markdown rendering and anchor links (only file paths were checked).
* No automated word-for-word diff between source and plan; comparison was manual. The plan reformats and groups the source (for example, merges repeated bullet lists by reference), so Rich should skim sections A, B, K.

## Remaining work

* Rich review of the PR (not merged automatically).
* Decisions on the items in product-plan.md section K and the UNDECIDED terms, when a feature needs them.

## Next recommended slice (recommendation only; NOT started)

Rich chooses the first slice from section A. Likely candidate: a feature spec for the Church Portal event submission (Church/Ministry Name, dates/times, address with Venue Name, Revival Types). It requires answers to the startup undecided items (flyer upload, livestream links), then a mock-first review and the Database Design Checkpoint before any schema work.
