# Rules review 11: `docs/testing.md` and `docs/automation/*` (nine guides)

Reviewed 2026-10-09 with the owner's five tests: **Sense**, **Standard**, **Solid**, **Enforced**, **Proven**. Standards named from recollection (not re-fetched): the test pyramid, Behavior-Driven Development and acceptance-test traceability, mutation testing as the measure of test quality, ISTQB-style test levels, and the Playwright documentation for API testing.

## Overall verdict

The rules are **sensible, standard and solid**, and they already match most of the owner's wishes: tests trace to acceptance criteria, coverage is a diagnostic and not a goal, unit tests stay deterministic, and native Playwright (including its API request mode) is allowed. Three things were missing and are added: proof that a test can fail, a numbered link from every acceptance criterion to a test, and a rule that every control in a feature is exercised. One line was stale. The enforcement of the testing rules themselves is mostly procedural (the pull request conversation), which is why the QA strategy document adds a checklist.

## Rule-by-rule

| Rule (document) | Standard | Enforced | Proven |
| --- | --- | --- | --- |
| Unit tests: isolated, deterministic, boundary and error cases, behavior not implementation, regression test per bug fix (`unit.md`) | Test pyramid; FIRST principles | Vitest in `pnpm validate`; env isolation helper | **Yes** for isolation: removing `DATABASE_URL` from the variables cleared before each test, or making isolation do nothing, each fails the helper's self-test. The other unit rules are guidance |
| Tests never touch `prod` or real secrets; guards are tested, not bypassed (`testing.md`, `integration.md`) | Environment safety | `env.test.ts`, tooling suites, integration test refuses unless `dev`/`qa` | **Yes** (environment ledger: five guard breaks) |
| Integration tests run in a separate command, only against `dev`/`qa`, from a known state (`integration.md`) | Test pyramid; test data management | Integration test self-guards; separate script | The guard is real; the tests **do not run in CI** (F-TEST-002) |
| Acceptance: every feature has explicit acceptance criteria; tests trace to criteria; failure and denial paths covered (`acceptance.md`) | BDD; requirements traceability | Procedural | **Gap, now closed in the rule**: criteria are numbered, the number goes in the test title, an unmatched criterion is an open item. A script to check this mechanically is planned in the QA strategy |
| Every control in a feature is exercised (`acceptance.md`, owner requirement) | Functional coverage | Was not a rule | **Added**: controls are listed in the spec and each gets an acceptance test that performs the action and checks the effect |
| E2E: few, important journeys; independent; non-production only (`e2e.md`) | Test pyramid | Playwright specs gated by their prerequisites | The proof-slice E2E exists; it is opt-in and not in CI |
| Playwright: native capabilities allowed, including the request API for API checks; never commit auth state or traces; target non-production only (`playwright.md`) | Tool minimalism | `.gitignore`, secrets guard | Guidance |
| API tests use the existing TypeScript stack, not Karate or REST Assured (`product-development.md`) | Tool minimalism | Procedural | Guidance; consistent with the owner's question and this review's recommendation |
| Coverage is diagnostic, not a target; no assertion-free tests (`coverage.md`) | Mutation testing over line coverage | No coverage tool configured | Guidance. The break-it check is the better measure and is now a rule |
| Test Value Review gates every test (`test-value-review.md`) | Risk-based testing | PR conversation | **Strengthened**: step 8, proof it can fail (the breaker) |
| Reporting: exact commands and real outcomes; never claim CI passed unless it ran (`reporting.md`, `README.md`) | Honest reporting | Procedural | Guidance. A reminder from this session: a chained command once opened a pull request after a failed validation, so the commit now runs only when validation exits cleanly |

## Fixed in this pull request

| Where | Change |
| --- | --- |
| `e2e.md` | Said Playwright was "not yet installed"; it is installed |
| `test-value-review.md` | Added step 8, the breaker: break the protected behavior on purpose and show the test fails. Clarified that "smallest valuable suite" does not mean few tests; completeness comes from the acceptance criteria |
| `acceptance.md` | Numbered criteria in test titles with an open-item rule; control inventory with an action-and-effect test per control |

## Gaps (tracked elsewhere)

| Gap | Where tracked |
| --- | --- |
| Integration and E2E tests never run in CI | F-TEST-002 |
| No mechanical check that each numbered criterion has a test | QA strategy document (queued) |
| No regression suite policy beyond "every bug fix adds a test", no per-feature test plan template, no mobile component or device tests | QA strategy document (queued) |
| Accessibility checks, security scanning, contract-compatibility tests | QA strategy, F-UX-002, F-AUTH-005 |
| Coverage tooling not configured (by decision) | None needed |

## Owner decisions

None for these documents.
