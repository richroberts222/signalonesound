# TEST: Testing and Verification

Examined 2026-10-08 (Pass 2) at `main` `826b53e`; since the baseline `31ec6ba` only two web test files changed (PR #88, path separators). Depth: Standard. Home for: test taxonomy and value; flakiness policy; coverage of authentication, authorization and error paths; integration and E2E strategy and their CI story; test environment safety; what the suite would and would not catch (`methodology.md` section 4).

## Method note

Evidence was gathered before the prior-input rows for TEST were re-read. Read: `docs/testing.md` in full and `docs/automation/` (all nine files, at heading level plus `coverage.md`, `e2e.md`); `.github/workflows/ci.yml`; `apps/web/playwright.config.ts` and `e2e/global-setup.ts`; the auth, API and service test files by name and by what they assert; the vitest configurations by name. Counted: 250 tests (web 171, shared 39, validation 24, mobile 10, boilerplate 6) in 34 test files; one integration test file and one Playwright spec; no component or render tests.

Run (RUN, 2026-10-08): the full web suite (171 passing) and **three deliberate-defect experiments** ("mutations") to measure whether the tests notice a broken protection. Each defect was introduced by editing one line, the web suite was run, and the file was restored with `git checkout -- <file>`; after each, the working folder was confirmed clean.

| # | Defect introduced | Result |
| --- | --- | --- |
| 1 | `isOwner` (`lib/auth/authorize.ts`) allows every actor | **Caught**: 6 tests failed across 5 files (auth primitives, service, API adapter, acceptance criterion AC8) |
| 2 | `proxy.ts` stops protecting `/dashboard` and `/admin` | **Not caught**: all 171 tests passed |
| 3 | API handler no longer rejects unauthenticated callers | **Caught**: 4 tests failed in 4 files (adapter, acceptance AC1, report wiring, route wiring) |

Not examined, and why: a mutation test of the shared validation schemas and the environment guards (their own unit tests are extensive; sampled only); the Playwright spec and the integration test were not run (they need a Clerk test user and a development database, which are not provisioned for automation, U-12, Q-003); mobile tests beyond their names.

## Findings

### F-TEST-001 Nothing tests which pages are protected: removing the route protection for `/admin` and `/dashboard` passes every test

| Field | Value |
| --- | --- |
| Status | Challenged |
| Severity | Medium |
| Confidence | High (RUN, mutation 2) |
| Timing | Now |
| Disposition | ADD |
| Scope | WEB |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: Mutation 2 above: dropping `"/dashboard(.*)"` and `"/admin(.*)"` from the route list in `proxy.ts` left all 171 tests green. A search finds no test, in any workspace, that mentions `proxy` (RUN). The layouts for `/account`, `/admin` and `/dashboard/church` call `getUserId()` and render nothing when it is empty, which is a second line of defence for those layouts, but no test covers it either, and pages outside those layouts (`/dashboard`, `/proof`) have no such check.

**Observation**: The suite is strong where the logic is (ownership, API authentication, validation, environment guards) and absent at the coarsest and most visible control: the list of pages that require sign-in. That list is one line in one file, edited by hand whenever a section is added, and a mistake in it exposes a whole area.

**Consequence**: A future edit that drops, misspells or forgets a route prefix (including a new area added without being listed) goes unnoticed until a person finds the page open.

**Recommendation**: Add a small test that is deny by default for pages: (1) assert the protected prefixes in `proxy.ts` exactly (import the list rather than copy it: export the matcher array); (2) enumerate the top-level route folders under `app/` and require each to be in an explicit public list (`/`, `discover`, `sign-in`, `sign-up`, `api`) or in the protected list, so a new folder fails the test until someone classifies it. This also serves F-AUTH-001's static tripwire. Effort is about 30 lines.

**Alternatives and tradeoffs**: A Playwright test against a running app (stronger, but not run in CI, F-TEST-002). Rely on the layout check alone (it does not cover every page).

**Affects**: `apps/web/proxy.ts` (export the list), a new test file.

**Depends on / sequencing**: Pairs with F-AUTH-001.

**Verification**: Re-running mutation 2 now fails at least one test; adding a new folder under `app/` fails the test until classified.

**Decisions needed**: none.

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Upheld
  Strongest case against: The layouts for `/account`, `/admin` and `/dashboard/church` re-check sign-in, so the mutation only exposes two pages (`/dashboard`, `/proof`) outside those layouts; the pages are mocks. A route-folder classification test could become a nuisance whenever a folder is added.
  Evidence re-checked: RUN `grep -rln proxy` over test and spec files: none mention `proxy`. READ `apps/web/proxy.ts`: the protected list is one inline array, not exported. The earlier author's mutation run (171 tests green) was not repeated by this review (no test runs permitted); the grep and the source corroborate it.
  Result: The cheapest tripwire in the register: about 30 lines, no secrets, no vendor, and it also serves F-AUTH-001. The nuisance cost is intended (a new folder must be classified). Needs a minimal edit to export the list from `proxy.ts`, which is a protective change, not feature work. Upheld at Medium.

**History**: 2026-10-08 created. Absorbs the page-protection part of P-CH-06 (tests of authorization).

---

### F-TEST-002 The tests that exercise real Clerk and a real database are manual and not in CI, so the integration of the pieces is unproven

| Field | Value |
| --- | --- |
| Status | Challenged |
| Severity | Low |
| Confidence | High for the facts; Medium for the consequence (it depends on the first real feature) |
| Timing | Trigger: first product table or endpoint |
| Disposition | DEFER |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | M |

**Evidence**: `docs/testing.md` states that the integration and E2E commands are not part of `validate` and "neither runs in CI yet"; `ci.yml` has one job and no workflow runs Playwright or the integration tests (RUN, search: 0 workflows). The unit suite replaces Clerk with a mock and the database with a fake repository (`proof-items.test.ts`, `auth.test.ts`). The Playwright spec and the integration test exist but need a Clerk development test user and a development database (U-12, Q-003); whether they were ever run after Issue 49 is not recorded (C-51).

**Observation**: Every automated test passes without real authentication ever happening and without a query ever reaching Postgres. That is the correct design for fast unit tests, and each fake is checked against the same acceptance suite as the real implementation (a good pattern), but the join between them (a real signed-in session reaching a real route that writes a real row) has no automated proof. Environment configuration problems (F-REL-001) and token problems (F-AUTH-005) live in exactly that join.

**Consequence**: The first real feature's most likely failures (a misconfigured Clerk instance, a database role missing a privilege, a migration not applied) are found by a person on a Preview.

**Recommendation**: Add one scheduled and on-demand workflow (a human edit, F-SEC-002 window) that runs the integration tests and one Playwright happy path against the **qa** database branch with a dedicated qa role (F-DATA-005) and a Clerk development test user, using a GitHub environment with the qa secret only. At the trigger, prefer a manual-dispatch run before each release over a nightly schedule (Pass 4), and combine it with the F-AUTH-005 spike so the real-token test exists once; not on every pull request. Make its failure visible (an issue or a notification), not blocking. Until the qa role exists, run it on the development branch the same way `claude.yml` already uses a development secret.

**Alternatives and tradeoffs**: Per-PR runs (slow, secret exposure on pull requests from forks of a public repository: not recommended). Manual only (the current state). A hosted test service (premature).

**Affects**: a new workflow file, GitHub environment and secrets (owner action), `docs/testing.md`.

**Depends on / sequencing**: F-DATA-005 (role), F-DATA-003 (CI migrations), F-SEC-002 (workflow window and secret scoping), Q-003.

**Verification**: The nightly run is green, and turning off a required Clerk or database variable turns it red.

**Decisions needed**: Q-003 (existing).

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Downgraded (Medium to Low; ADD to DEFER)
  Strongest case against: A nightly workflow with a real Clerk user and a real database, failing non-blocking to a notification a non-developer will not triage, is process theater for a project with no product tables. It needs a human workflow edit, a GitHub Environment, a Clerk test user and a qa role (F-DATA-005), and it overlaps F-AUTH-005 (real token test) and F-DATA-003 option (c).
  Evidence re-checked: RUN `ls .github/workflows`: three workflows, none runs integration or Playwright. READ `docs/testing.md`: both 'not part of validate', 'neither runs in CI yet'. READ `apps/web/db/proof-items.integration.test.ts`: needs a Neon URL.
  Result: The unproven join is real, but the consequence today is nil. Re-trigger at the first product table or endpoint, and then prefer a manual-dispatch workflow before each release over a nightly job. Combine with the F-AUTH-005 spike so the real-token test exists once. Low, DEFER.

Challenge (Pass 4b, 2026-10-08): verdict Upheld
  Re-checked: RUN `ls .github/workflows`: three workflows, none runs integration or Playwright. READ the Recommendation: it still said nightly; updated to manual dispatch before release, combined with F-AUTH-005.
  Result: Low / DEFER holds. Grade: RUN, READ.

**History**: 2026-10-08 created. Absorbs P-GAP-02 and C-51.


**History (Pass 4, 2026-10-08)**: Medium to Low and ADD to DEFER; nothing to integrate yet, overlaps F-AUTH-005 and F-DATA-003.

**History (Pass 4b, 2026-10-08)**: Recommendation updated to Pass 4: manual-dispatch before release, combined with F-AUTH-005.

---

### F-TEST-003 Pages are verified only by compilation: no render, accessibility or browser smoke tests

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High |
| Timing | Trigger: the first real-data page, and before any public launch for accessibility |
| Disposition | DEFER |
| Scope | WEB |
| Trigger class | Trigger-gated |
| Effort | M |

**Evidence**: There are no `.test.tsx` files and no component-testing or accessibility dependencies in the repository (RUN, search); only Playwright is installed. The mock product pages (Discover, church, member, admin) are checked by `next build` (they compile) and by pure-function tests of their data modules (filters, navigation, mock data). `P-NOTES-02` records that Playwright, root `validate`, browser rendering and iPhone Safari were not verified for Issue 76.

**Observation**: For disposable mocks this is the right amount of testing. It changes once pages carry real data and real forms.

**Consequence**: A broken page, a missing label, or a mobile-width layout failure reaches the owner's review of the Preview, or a user.

**Recommendation**: At the trigger: add component tests for forms and states that carry logic, and one Playwright smoke that visits each public page, asserts a 200 and no console errors, and runs an automated accessibility scan, run in the F-TEST-002 workflow. Keep the owner's phone review of the Preview as the exploratory step, recorded in the PR.

**Alternatives and tradeoffs**: Add tests for the mocks now (waste: they are disposable, Q-005).

**Affects**: a test dependency set, `docs/testing.md`, `docs/ui.md` (UX).

**Depends on / sequencing**: F-TEST-002; UX (accessibility standard).

**Verification**: The scan and smoke run in the scheduled workflow.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Absorbs P-NOTES-02.

---

### F-TEST-004 `docs/testing.md` describes a CI job that does not exist and omits one that runs

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: The CI section says the workflow has a `validate` job and a `workflow-lint` job running actionlint; `ci.yml` has only `validate` (READ, RUN `grep` for job names). The commands table lists `pnpm validate` as "lint, typecheck, test:run, build"; the script also runs `test:boilerplate` (C-30). The local gate is red on Windows for test 3 of the boilerplate self-test (issue #87).

**Observation**: The actionlint job is a good idea that was documented and not built, or built and removed. A human edits workflow files, possibly from a phone, and a malformed workflow file fails silently at the next push.

**Consequence**: A reader believes workflow files are validated. They are not.

**Recommendation**: Add the actionlint job (a small pinned binary, as the document describes) in the F-SEC-002 workflow edit window, or delete the sentence. Recommended: add it. Correct the commands table.

**Alternatives and tradeoffs**: Delete the claim only (cheaper, loses the protection).

**Affects**: `.github/workflows/ci.yml` (human edit), `docs/testing.md`.

**Depends on / sequencing**: F-SEC-002 workflow window.

**Verification**: A deliberately malformed workflow file fails CI.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Absorbs C-30.

---

### F-TEST-005 There is no flaky-test policy, retry rule, or test-results visibility

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High |
| Timing | Trigger: the first end-to-end test in CI |
| Disposition | DEFER |
| Scope | BOTH |
| Trigger class | Trigger-gated |
| Effort | S |

**Evidence**: The only mention of flakiness is one sentence in `docs/automation/e2e.md:9`. Playwright is configured with `retries: 0` and one worker; CI reports only pass or fail. Unit tests are deterministic and fast (the whole workspace runs in seconds).

**Observation**: No flaky tests exist today, and a policy for none is correctly not yet needed. End-to-end tests against real services are the first tests likely to flake.

**Consequence**: At the first flaky run, the team improvises: retry until green, or disable the test, with no record.

**Recommendation**: At the trigger, write five lines: a failing end-to-end test blocks nothing but is a ticket; a test that fails and then passes on retry is quarantined within a week or fixed; retries are limited to one and are logged; the results are attached to the workflow run (Playwright's report).

**Alternatives and tradeoffs**: Write the policy now (speculative).

**Affects**: `docs/automation/e2e.md`.

**Depends on / sequencing**: F-TEST-002.

**Verification**: The policy exists and the workflow attaches the report.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created. Absorbs P-CH-13.

---

### F-TEST-006 The security-critical logic is well tested, and the tests bite; the static boundary tests are worth keeping

KEEP. Evidence: 250 tests across five workspaces; mutation experiments 1 and 3 above were caught by 6 and 4 tests in 5 and 4 files, so the ownership rule and the API authentication each have layered, independent checks (primitive, service, adapter, acceptance suite, route wiring); the same acceptance suite runs against the fake and, in the integration run, the real database (P-CH-09 pattern); unit tests run with no credentials by construction (`setup.ts`); the static tests (secret shapes, server-only imports, client boundaries) have found real problems in this audit's own files and run in seconds. Why it is sound: tests are placed where the risk is (authorization, validation, boundaries) and not spread for a coverage number, which matches `coverage.md`. Limits, recorded not fixed: the static source-text tests do not follow transitive imports, and `server-only` is the build-time backstop (P-SEC-08); add an ESLint restricted-import rule only if a violation ever slips past the static tests (P-78-O06). Tripwire: a security-relevant file with no test that fails when the file is broken (repeat the mutation experiment before trusting a new control).

---

## Reconciliation of prior inputs (TEST)

| Input | Outcome |
| --- | --- |
| P-78-O02 replace the Test Value Review with a short rubric | Rejected as stated: no evidence the review suppressed valuable tests (F-TEST-006: critical logic is layered); the real gap (the route list) was a missed risk, not a rejected test (F-TEST-001). Keep the process; its five questions already work as a rubric. |
| P-78-O06 static source-text security tests give false confidence | Modified → F-TEST-006: the static tests bite and stay; add lint boundary rules only on a miss |
| P-CH-13 test taxonomy and flaky-test policy | Adopted, deferred → F-TEST-005 (taxonomy is adequately documented in `testing.md`) |
| P-GAP-02 no CI job for integration or E2E | Adopted → F-TEST-002 |
| P-SEC-08 static checks do not follow transitive imports | Recorded as a limit → F-TEST-006 |
| P-NOTES-02 verification not performed on Issue 76 | Adopted → F-TEST-003 |

Challenges to prior work: **C-51** stands and is sharpened (F-TEST-002). **The ledger's reading that the layout check is "defence in depth" for protected pages** is true for three layouts and not for `/dashboard` or `/proof` themselves (F-TEST-001). No prior finding was rejected beyond P-78-O02.

## Lens matrix

| Lens | Result |
| --- | --- |
| L1 Drift | F-TEST-004 (a CI job described but absent; command list). |
| L2 Enforcement | F-TEST-001 (an untested control), F-TEST-006 (controls that bite; mutation evidence). Coverage tooling is deliberately absent and not a defect (`coverage.md`). |
| L3 Adversary | F-TEST-001 (route list), F-TEST-002 (a real session is never exercised). |
| L4 Failure and recovery | F-TEST-002 (configuration failures found late), F-TEST-005. |
| L5 Scale and cost | Examined, nothing material: the full suite is fast; per-PR end-to-end runs are deliberately not recommended (F-TEST-002). |
| L6 Longevity | F-TEST-001 (a control that survives only if someone remembers it), F-TEST-006. |
| L7 Compatibility | Mobile has only pure-TypeScript tests; a valid-token mobile test is F-AUTH-005. F-TEST-003 for browsers. |
| L8 Simplicity | F-TEST-006 (tests placed on risk, not on a number); F-TEST-002 prefers one scheduled workflow to per-PR pipelines. |
| L9 Boilerplate fit | The route-list test (F-TEST-001) and the acceptance-suite-against-fake-and-real pattern belong in the template; F-TEST-002 and -005 are trigger-gated. |

## Carry-forward to other subjects

* **SEC/DEVOS**: the workflow edit window now holds F-SEC-002, F-DEVOS-002, F-REL-001, F-REL-003, F-TEST-002 and F-TEST-004; plan one human edit.
* **DATA**: a qa role for the scheduled run (F-DATA-005); CI migrations (F-DATA-003).
* **AUTH**: the route-list test serves F-AUTH-001's tripwire; the valid-token mobile test (F-AUTH-005).
* **UX**: the accessibility standard and automated scan (F-TEST-003).
* **OPS**: nightly run notifications.
* **BOIL**: the template should carry the route-list test and the acceptance-suite pattern.
* **Platform facts still needed**: whether the Playwright spec was ever run after Issue 49 (owner recollection); whether a Clerk test user exists (U-12).
