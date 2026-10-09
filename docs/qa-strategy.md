# QA Strategy

How quality is planned, tested, and declared done for a web and mobile platform. `/docs/testing.md` holds the commands and current status; `/docs/automation/` holds the per-layer rules; this document ties them into one strategy: what each layer proves, when work is done, how regressions are caught, and which tools are used.

**Standards followed** (from established practice; confirm against current publications before citing externally): the test pyramid, behavior-driven acceptance criteria with requirements traceability, mutation testing as the measure of test quality, WCAG 2.2 AA for accessibility, OWASP ASVS and the OWASP API Security Top 10 for security testing, and DORA delivery practices.

## 1. Principles

1. **A test is meaningful only if it can fail for the right reason.** Break the behavior on purpose and watch the test fail (the breaker, `/docs/automation/test-value-review.md` step 8). A test that still passes with the protected behavior removed protects nothing.
2. **Completeness comes from acceptance criteria, not from a test count.** Every numbered criterion has a test. The Test Value Review stops tests that exist only to raise a number.
3. **Test at the lowest layer that can prove the behavior.** Business rules in unit and service tests, boundaries in integration tests, user-visible behavior in acceptance tests, a few critical journeys in end-to-end tests.
4. **Tests never touch `prod` or real secrets** (`/docs/environment.md`).
5. **Report exactly what ran.** Never claim a check passed that did not run.

## 2. Test layers

| Layer | Proves | Tool | Runs | Status |
| --- | --- | --- | --- | --- |
| Unit | One piece of logic: validation, rules, mappers | Vitest | Every pull request (`pnpm validate`) | Implemented |
| Service and boundary | Business rules with fake data access; layer boundaries (static checks) | Vitest | Every pull request | Implemented |
| Integration | Real PostgreSQL behavior of repositories and migrations | Vitest, `test:integration` | A separate CI job against the `qa` database | Implemented; **not in CI yet** (F-TEST-002) |
| API | Real HTTP requests to the running server: authentication, validation, authorization, status codes, the response envelope, ownership | **Playwright's `request` fixture** (same tool and language as the browser tests) | The same separate CI job | Planned with the first real endpoint |
| Contract | Responses match the shared schemas in `@signalone/validation`; a field is never removed inside a version | Vitest over recorded responses and the shared schemas | Every pull request | Planned (F-AUTH-005) |
| Frontend acceptance | Each acceptance criterion and each control of a feature, as user-visible behavior | Playwright against the web app | The separate CI job | Planned with the first feature |
| End-to-end | A few critical journeys across the real stack | Playwright | The separate CI job | Implemented for the demo slice; opt-in |
| Mobile | Unit and boundary today; the app against the real API on a device | Vitest; EAS development build on a physical phone; component and device tests when the first screens exist | Unit in `validate`; device by hand until automation is justified | Boundary tests implemented; device not exercised |
| Accessibility | WCAG 2.2 AA: automated rules plus a screen-reader pass | axe via Playwright; manual pass | Automated in the browser job; manual before launch | Planned (F-UX-002) |
| Security | See section 7 | CodeQL, secret scanning, Dependabot, OWASP ZAP | See section 7 | Partly planned |
| Regression | Previously fixed bugs and previously delivered features still work | The suites above, tagged | See section 5 | Policy below |

**API testing tool.** The project does not adopt Karate or REST Assured: both are Java tools and would add a second language and toolchain. Playwright already provides API testing, so one tool covers browser and API tests, and API tests can import the shared validation schemas as the contract (`/docs/product-development.md` section 6 records the same rule).

## 3. Definition of done (per feature)

A feature is **done** when its checklist is complete and nothing else. The checklist lives in the feature specification (`/docs/features/README.md`) and is copied into the issue.

1. **Scope fence.** The issue states what is in and what is out. Work beyond the fence is recommended in the pull request and not built.
2. **Numbered acceptance criteria** (AC1, AC2, ...), each testable.
3. **Controls inventory.** Every button, input, select, link and toggle, with its action and expected effect.
4. **Proof for every item.** Each criterion and each control is ticked with the test (title carries the number) or the manual step that proves it. A criterion with no test is either automated or listed as not automated with the reason.
5. **Every new test passed the breaker** (broken on purpose, failed, restored). The pull request reports the break and the result.
6. **Layers.** The test plan (section 4) names the layers used and why.
7. **Gates green.** `pnpm validate` and the pull request checks pass; the exact commands and results are reported.
8. **Human review** where the spec requires it (Vercel Preview for web; device check for mobile), with the exact steps given.
9. **Documentation matches reality** and known limitations are recorded.
10. **Stop.** When every item is ticked, the work stops. The assistant reports "done, with the proof for each item" and lists recommendations separately. It does not continue into adjacent work.

## 4. Test plan template (one per feature, in the spec or the pull request)

| Field | Content |
| --- | --- |
| Scope | In and out (the scope fence) |
| Risks | What could realistically go wrong, ranked |
| Criteria and controls | The numbered list, each with its layer |
| Test data | Which seeds, which accounts (development or test instances only) |
| Layers used, layers skipped | With the reason for each skip |
| Environments | `dev`, `qa`; never `prod` |
| Entry criteria | Spec approved, schema reviewed where applicable |
| Exit criteria | The definition of done above |
| Manual checks | Exact steps for the human reviewer |

## 5. Regression policy

* **Every bug fix adds a test that fails without the fix** (`/docs/automation/unit.md`), and the pull request shows it failing.
* **Delivered features stay protected** by their acceptance tests. They are never deleted to make a change pass.
* **Tag critical tests** (`@critical` in the title) for a fast smoke subset that runs on every pull request once the browser job exists. The full suite runs on `main` and before a release.
* **Before a release** (web promotion or a mobile build): the full suite, the accessibility scan, and the release checklist (`/docs/release.md`).
* **Flaky tests are defects.** A test that fails intermittently is fixed or quarantined with an issue within a week. It is never ignored or retried until green.

## 6. CI plan

| Job | What | Status |
| --- | --- | --- |
| `Validate` (required) | Install, lint, typecheck, unit and service tests, template tests, build; no secrets | Built |
| `Integration and browser` | Migrate and reset the `qa` database, run the integration, API, acceptance and end-to-end tests; secrets in a protected GitHub Environment; skipped for Dependabot pull requests (they cannot read secrets); never any `prod` value | Planned (F-TEST-002); becomes a required check after a week green |
| Accessibility scan | axe over the key pages | Planned |
| Security scans | CodeQL (default setup), secret scanning, Dependabot alerts | Settings to enable (owner action) |
| `Template proof` | Generates a new application from the template and runs its own install, lint, typecheck, tests, build and first migration (`pnpm prove:init --full`); informational until green for a week | Built |
| Scheduled health (`health.yml`) | Weekly `pnpm audit`, `pnpm peers check` and `expo install --check`; reports, never blocks | Built |

## 7. Security testing layers

**Hostile-payload suite (built):** `apps/web/lib/api/hostile-payloads.test.ts` feeds the API adapter crafted bodies and query strings (nesting bombs, prototype-pollution keys, wrong types, huge values, injection-looking text, scripts); every one must end in the standard response, never a crash, never an echo of the input, and the service must not run for invalid input. Modern attacks are API requests with malicious payloads, so each new endpoint's acceptance tests add its own hostile cases (changed ids for object-level authorization, extra fields for mass assignment).

| Layer | Tool | Cost | When |
| --- | --- | --- | --- |
| Code scanning | GitHub CodeQL, default setup | Free for a public repository | Now (a repository setting) |
| Secret scanning and push protection | GitHub built-in | Free for a public repository | Now (a repository setting) |
| Known-vulnerable packages | Dependabot alerts, `pnpm audit` | Free | Now |
| Automated web scan | **OWASP ZAP baseline scan** of a Vercel Preview in CI (needs a Vercel protection-bypass token, an owner setting) | Free | After the first real endpoints exist |
| Manual penetration test | Burp Suite Community by hand, or a professional test | Free, or paid (ask first) | Before real users or payments, and after major authentication changes |

Scan only our own Preview environments, never the live site, and check the hosting provider's security-testing rules first.

## 8. Docker and containers

Not adopted now. Neon database branches replace a local database container, and Vercel handles deployment. Adopt **when a trigger happens**, not before:

* A third developer joins: add a dev container for a one-command setup.
* Browser tests become flaky from environment differences: run CI in the official Playwright container image for identical browser versions.

## 9. Enforcement and proof status

| Rule | Mechanism | Proof |
| --- | --- | --- |
| Unit, service, boundary and template tests run on every pull request | `Validate` is a required check | Proven (ruleset read back; many guards broken on purpose, see `/docs/audit/rules-review/`) |
| Tests never touch `prod` | Environment guards, integration self-guard | Proven (five guards broken) |
| Every numbered criterion has a test | **Planned:** a small script that reads the numbered criteria in `docs/features/*.md` and fails if a test title lacks the number. Built with the first feature specification | Not yet |
| Every new test has a breaker | Pull request checklist; reported in the pull request | Procedural |
| Definition of done is a checklist, not a menu | Pull request template (planned, F-DEVOS-010) | Not yet |
| Integration and browser tests run in CI | Planned job | Not yet |

## 10. Mobile specifics

* The first real device proof is the walking skeleton: an EAS development build on a physical phone signing in through Clerk and calling the shared API. That one journey proves the shared contract, validation, authentication and database end to end.
* Mobile reuses the shared contracts and the API test suite; it does not duplicate server rules.
* Component and device tests are added when the first interactive screens exist (the tool is chosen then, for example `jest-expo`).
