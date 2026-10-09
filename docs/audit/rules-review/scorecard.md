# Rule scorecard: confidence per rule

Compiled 2026-10-09 from the twelve document reviews (the ledgers in this folder), the proof sweep below, and the new rule documents. Each rule group gets one confidence level.

**Scale** (the owner's five tests: sense, standard, solid, enforced, proven):

| Level | Meaning |
| --- | --- |
| **High** | The rule makes sense, matches a named standard, is correct, is enforced by a mechanism, and the enforcement was **broken on purpose and caught** |
| **Medium** | Enforced, but not yet broken on purpose; or enforcement covers only part of the rule; or the mechanism is a repository setting that was read back but cannot be broken safely |
| **Low** | Sensible and standard but **written down only** (judgment guidance or process), or enforced only in a limited, partly built form |
| **None** | Decided and documented, **not built** or not in place yet |

Standards named in the ledgers come from established practice and are not re-fetched here; confirm before citing them externally.

## 1. Rules by area

| Area | Rule group | Level | Why |
| --- | --- | --- | --- |
| **Secrets and environment** | No secrets or credential-shaped values in committed files; placeholders only | **High** | `security.test.ts` secret patterns; real-looking key in the example file fails 2 tests (sweep W10) |
| | Local env files are gitignored | **High** | Removing the ignore rule fails 1 test (W9) |
| | Public variable names cannot carry secret-like words; the client env module reads only an allow-list; `next.config` does not forward secrets | **High** | Three breaks, each caught (W1, W2, W3) |
| | Environment identity explicit; prod/non-prod mismatch, Preview rules, live-key refusal, destructive-tooling refusals | **High** | Five guards broken, each caught (environment ledger) |
| | Test isolation: tests run with no database or auth environment | **High** | Two breaks caught (testing ledger) |
| **Authentication and authorization** | Server verifies identity; deny by default; ownership from the trusted actor; empty or throwing rules deny | **High** | Seven breaks caught (auth ledger) |
| | Every top-level route has a protection decision | **High** | Removing `/admin` protection fails 2 tests; an undecided route directory fails 1; the test now also passes in generated apps |
| | Roles in the database, request-then-approve, admin allow-list, audit trail | **None** | Decided (`permissions.md`); not built |
| | Mobile sign-in with a Clerk bearer token | **Low** | The API accepts the token; no real token has ever been carried |
| | Two-factor sign-in | **None** | Accepted risk (owner) |
| **API** | Authenticate first, validate, one response envelope, safe errors, versioning | **High** | Authentication, caching header, internal-error text, size cap and off-by-one all broken and caught (api ledger) |
| | Additive-only versioning, old mobile builds keep working | **Low** | Rule is sound; no contract-compatibility test yet |
| | Rate limiting, security headers | **None** | Not in place (F-SEC-006, F-SEC-005) |
| **Service and architecture layers** | Services are framework-free; no Clerk, database client, `FormData` or `process.env` | **High** | Break caught (W4 and earlier) |
| | Service error mapping (forbidden, conflict, internal text, reporting) | **High** | Four breaks caught (services ledger) |
| | Client code never imports server, database or tooling modules | **High** | W5, W6 caught |
| | The database libraries only in the data layer; the Clerk SDK only in its adapter locations | **High** | Both guards added this review and proven |
| | Dependencies flow apps, validation, shared; never the reverse; mobile imports no web or server code | **High** | Guard added and proven three ways; mobile imports of web code and the ORM caught; a server secret read in mobile caught (W12) |
| | Ports at replaceable boundaries (Clean Architecture) | **Medium** | Three ports exist and two import guards enforce the adapters; the rest are created with their first feature |
| **Database** | Versioned migrations only; `drizzle-kit push` never exposed; unknown history flagged | **High** | W7 and W13 caught |
| | Reset and seed: dev and qa only; never drop or alter migration history | **High** | Two real behavior breaks caught (W8b, W8c) |
| | Transactions limit of the `neon-http` driver is documented | **Medium** | Recorded by a test; the rule documents agree |
| | Backups, restore drill, production migration procedure, role separation | **None** | Not done (F-DATA-001, -002, -005) |
| | Neon branches exist as designed | **Low** | Only the default branch is confirmed |
| **UI** | Every control from shadcn/ui; no raw colors | **High** | Two ratchet guards proven; **17 raw controls and 8 raw colors remain by allowance** (issue 91) |
| | Accessibility (WCAG 2.2 AA) | **None** | Target stated; nothing enforced or measured (F-UX-002) |
| **Git and delivery** | `main` protected: pull request, `Validate`, no force-push, no bypass | **Medium** | Read back from GitHub; cannot be broken safely |
| | Merge only with the owner's explicit authorization | **Medium** | Rule in three documents; the permission prompt blocked an unclear authorization; not scripted |
| | Branch and commit conventions; destructive-Git guard; foundation tag protection | **Low** | Guidance only (proposals awaiting the owner) |
| | Workflow security (least privilege, pinned actions, exact command list, no database credential, no merge command) | **High** | Six breaks caught in the Wave 1 work |
| | Release process, rollback, post-deploy check, Stage | **None** | Documented (`release.md`); not built (F-REL-001, -002) |
| | Mobile builds and store release | **None** | `eas.json` exists; no build has run |
| **Quality and process** | Test layers, acceptance criteria, controls inventory, test plan, regression | **Low** | Documented in `qa-strategy.md`; enforced by review, not by a tool yet |
| | Every new test must have a breaker | **Low** | Procedural until the pull request checklist exists |
| | Integration and browser tests run in CI | **None** | Not in CI (F-TEST-002) |
| | Documentation index complete and `CLAUDE.md` concise | **High** | Guard proven two ways (unlinked document fails; padding fails) |
| | Documentation matches the code | **Medium** | Every document reviewed once; about 25 stale statements fixed; no automatic drift check by decision |
| | Dependency and tooling compatibility | **Medium** | Rule written; majors skipped by Dependabot; peer and Expo checks run by hand, not in CI |
| **Template** | Identity rewrite, leak detection, copy only committed files, generated app passes its own checks | **High** | Several breaks caught; the full generated-app proof re-run found and fixed a real bug |
| | The product features are removed from a generated app | **None** | Gap (independent audit B1) |
| **Legal and risk** | Collection gate, age rule, terms and privacy, deletion and export | **None** | Decided (`risk-and-legal.md`); not built |
| | Compliance applicability, accepted risks, owner actions | **Low** | Documented checklist, not legal advice; owner actions pending |
| | Dependency vulnerabilities known and handled | **Low** | Dependabot on; alerts setting pending; `pnpm audit` not in CI |
| **Payments, third-party integrations** | Hosted checkout, signed idempotent webhooks, ports per vendor | **None** | Documented (`payments.md`, `integrations.md`); nothing built, all vendors undecided |

## 2. Proof sweep (this review): rules broken on purpose

Sabotage applied, relevant tests run, original restored, then all tests confirmed passing again.

| Id | Break | Result |
| --- | --- | --- |
| W1 | A public environment variable name containing `DATABASE` | Caught (2 tests) |
| W2 | The client env module reads a non-public name | Caught (3 tests) |
| W3 | `next.config` forwards a secret through the `env` option | Caught (2 tests) |
| W4 | Service layer uses `FormData` | Caught (1 test) |
| W5 | A client component imports the database module | Caught (1 test) |
| W6 | A component imports the server env module | Caught (1 test) |
| W7 | A package script exposes `drizzle-kit push` | Caught (1 test) |
| W8 | A string added to the reset tool (no behavior change) | **Not caught, by design** (an unused string changes nothing); replaced by W8b and W8c |
| W8b | Reset also issues `DROP SCHEMA drizzle` | Caught (1 test) |
| W8c | Reset drops tables instead of emptying them | Caught (1 test) |
| W9 | `.gitignore` no longer ignores local env files | Caught (1 test) |
| W10 | A real-looking secret key in the example env file | Caught (2 tests) |
| W11 | A component imports the stray `cn` package | Caught (1 test) |
| W12 | Mobile code reads a server secret | Caught (1 test) |
| W13 | A committed migration file deleted | Caught (1 test) |

Earlier in the review (see the other ledgers): authentication and authorization (7 breaks), `apiRoute` (6), service error mapping (4), environment guards (5), test isolation (2), dependency direction (3), workflow security (6), token and data-layer guards (5), `CLAUDE.md` guard (2), route protection (4), and others. In total, more than 60 deliberate breaks across the review, one real test weakness found (the request-size cap) and one real template defect found (the route-protection test in generated apps).

## 3. Reading the scorecard

* **Where to trust the rules today:** secrets and environment safety, server-side authentication and the API, layer boundaries, database tooling, workflow security, the template mechanism.
* **Where the rules are sound but unproven or unbuilt:** mobile, roles and permissions, payments and integrations, legal gates, release and rollback, accessibility, rate limits and headers, integration tests in CI.
* **What would raise the next level of confidence:** the mobile walking skeleton, the CI integration job, the pull request checklist (the breaker and the definition of done), and the first feature built end to end under the definition of done.
