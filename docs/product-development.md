# Product Development System

How Signal One Sound product features are planned, prototyped, implemented, tested, documented, reviewed, and handed off. This document integrates (does not replace) the existing rules: `/docs/architecture-rules.md`, `/docs/database.md`, `/docs/testing.md`, `/docs/automation/` (including `test-value-review.md`), `/docs/git-workflow.md`, `/docs/issues.md`, `/docs/environment.md`, `/docs/deployment.md`.

## 1. Authority

| Question | Authoritative source |
| --- | --- |
| What is the product intended to become? | `/docs/product/product-plan.md` (direction only) |
| What is next / in what order? | `/docs/product/roadmap.md` |
| What exactly is approved for this feature? | the approved spec in `/docs/features/` plus the issue |
| What do we call things? | `/docs/naming-conventions.md` |
| How is it built? | `/docs/architecture-rules.md` and the other `/docs` rules |

**Knowledge of a future feature is not authorization to implement it.** The product plan defines direction; individual approved issues/features authorize implementation. Only the minimum/startup tier of the plan describes current targets, and even it requires an approved issue.

**Repository facts outrank external assumptions.** If an instruction assumes X but the repository shows Y: do not blindly implement X. Report what was assumed, what the repository contains, why it matters, and the recommended resolution. If it could materially change architecture, behavior, data, or compatibility, stop and ask before proceeding.

## 2. Delivery pipeline

```text
Requirements
-> Acceptance Criteria
-> Mock/Prototype (where valuable)
-> Human Product Review
-> Test Value Review
-> Data/Schema Review (where applicable)
-> Implementation
-> Automated Validation
-> Vercel Preview (where applicable)
-> Manual Exploratory Testing
-> Final Regression/Validation
-> PR Review
-> Merge (human only)
```

**ONE FEATURE SLICE / ISSUE / CANONICAL BRANCH / PR AT A TIME** (`/docs/issues.md`). Claude never starts the next slice automatically; it may recommend one in `docs/notes.md`.

## 3. Mock-first discovery

For significant new user-facing functionality, prefer when practical:

```text
Product Requirement -> User Flow / Requirements -> UI with Mock Data
-> Human Exploratory Review -> Refine Workflow -> Finalize Acceptance Criteria
-> Identify Data Requirements -> Schema/API/Service Planning
-> Real Implementation -> Automated Verification -> Human Verification -> Merge
```

* Mock-first is a preferred discovery technique, not a requirement for every task. Infrastructure/backend-only work may skip a mock UI.
* Mock code must be clearly identifiable as mock/static (for example, `mock-data.ts` and notes saying so) and must not simulate persistence or backend behavior in a misleading way.
* Exploratory UI is reviewed in a **Vercel Preview before merge**. Do not merge exploratory UI merely to obtain a preview. Exploratory PRs are not merged until Rich has had the intended opportunity to review.

## 4. Feature specifications

Meaningful features have a spec in `/docs/features/` (see its README for sections). Include only sections that apply.

## 5. Database design checkpoint

Applies before introducing or materially changing persistent product data. It extends `/docs/database.md` (sections 6, 10, 12, 22) and does not override it.

1. Review approved feature requirements.
2. Review approved user flow/UI where applicable.
3. Identify required data points.
4. Identify relationships/cardinality.
5. Identify ownership boundaries.
6. Identify authentication/authorization implications.
7. Identify required queries, searches, filtering, sorting, and pagination.
8. Identify uniqueness and integrity constraints.
9. Consider multi-value, recurring, temporal, and location-based behavior.
10. Identify deletion/archive/history requirements.
11. Review the existing schema for reuse.
12. Propose the smallest appropriate schema change.
13. Identify migration implications.
14. Identify reset/seed implications.
15. Identify test-data requirements.
16. Identify the environments in which validation will occur.

The schema may evolve as requirements become clearer. Do not design future schema merely because it appears in the long-term plan; persistent structures are driven by approved requirements. PROD data/schema is never modified by feature development except through the existing production rules and explicit authorization.

## 6. Testing strategy

The Test Value Review (`/docs/automation/test-value-review.md`) remains the gate for every automated test. No feature automatically requires every layer. Protect each meaningful behavior at the lowest useful layer; give important cross-system behavior and critical user journeys broader coverage.

| Layer | Use for | Detailed rules |
| --- | --- | --- |
| Unit | isolated logic, validation, transformations, utilities | `automation/unit.md` |
| Integration | meaningful boundaries (service/repository/database) | `automation/integration.md` |
| API | request/response, contracts, validation, authn/authz, errors, real HTTP where appropriate | `automation/integration.md`, `automation/acceptance.md`, `/docs/api.md` |
| Database verification | where persistence matters, verify actual DB state; an API success response does not prove persistence | `automation/integration.md`, `/docs/database.md` |
| Frontend acceptance | user-facing behavior against acceptance criteria | `automation/acceptance.md` |
| Playwright E2E | important complete user journeys | `automation/e2e.md`, `automation/playwright.md` |
| Manual exploratory | subjective, visual, unusual, device-specific, exploratory checks | section 8 |

Do not add tests for test count, coverage percentage, trivial framework behavior, duplicated adequate coverage, or low-value implementation details. Prefer the smallest valuable suite. Do not introduce REST Assured, Karate, or another API test framework merely because API testing is needed; use the existing TypeScript stack. A specialized tool may be evaluated later for a concrete need. Do not create tests solely for documentation changes.

## 7. Database reset / seed / test state

Existing infrastructure is reused (`/docs/database.md` section 12; `pnpm --filter web db:reset|db:seed|db:refresh --env=dev|qa`). Do not replace it unnecessarily.

* When a feature needs a known starting state, add deterministic, idempotent seed data (fake/test-safe) with the feature's migration, per `database.md` 12.2.
* Typical flow: reset a non-production environment (dev/qa only) -> seed known feature data -> integration/API/database tests -> acceptance/E2E -> verify expected state.
* stage and prod are never reset or seeded. All existing PROD safeguards apply unchanged.

## 8. Manual exploratory testing

When human review is valuable, the feature spec and/or `docs/notes.md` give Rich concrete instructions, not "test the feature":

* where to go (Vercel Preview URL/route);
* prerequisites (account, data, device);
* exact actions;
* expected result;
* important edge cases;
* mobile/desktop considerations where relevant;
* intentionally exploratory areas.

Web features normally get a Vercel Preview review before merge.

## 9. Definition of Done

For a meaningful product feature, applicable items from:

* approved requirements implemented; acceptance criteria satisfied
* architecture rules followed
* appropriate automated tests pass (per Test Value Review)
* database behavior verified where applicable
* lint, typecheck, and build pass (`pnpm validate`)
* relevant integration/API/acceptance/E2E pass
* manual exploratory review completed where required
* documentation reflects the actual implementation; known limitations recorded
* no unexplained documentation/code drift

Not every feature needs every item; applicability follows feature scope and the Test Value Review. Report exact results; never claim CI passed unless it ran.

## 10. Documentation drift

Material documentation drift is a defect. When implementation changes a feature contract, architecture rule, API contract, schema expectation, or canonical terminology, update the appropriate documentation in the same work. Do not leave docs describing behavior that no longer exists. Do not rewrite historical documentation merely for cosmetic consistency when that would erase useful context.

## 11. Handoff

`docs/notes.md` is the temporary handoff record for the active canonical branch/PR; its format is defined in `/docs/issues.md`. It is overwritten, never appended to, and must give exact visibility into the current implementation.
