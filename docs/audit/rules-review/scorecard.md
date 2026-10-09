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
| | Additive-only versioning, old mobile builds keep working | **High** (generic contracts) | Snapshot compatibility test; four breaking changes caught and a compatible addition allowed; domain contracts are added with their features |
| | Security headers (anti-framing, nosniff, referrer and permissions policy, HTTPS) | **High** | Four breaks caught; confirmed on a real running build (page and API route) |
| | Full script policy (CSP script-src), rate limiting | **None** | Not in place (F-SEC-005, F-SEC-006) |
| | Hostile API payloads (nesting bombs, prototype pollution, wrong types, injection-looking text) | **High** | New suite; two sabotages of the adapter caught |
| | Cross-site scripting: no raw HTML, no eval, safe external links | **High** | Four lint rules, each broken by a probe and caught |
| | Data tiers and secure-coding checklist (`secure-coding.md`) | **Low** | Documented; the pull request template asks the questions; enforcement is review plus the guards above |
| **Service and architecture layers** | Services are framework-free; no Clerk, database client, `FormData` or `process.env` | **High** | Break caught (W4 and earlier) |
| | Service error mapping (forbidden, conflict, internal text, reporting) | **High** | Four breaks caught (services ledger) |
| | Client code never imports server, database or tooling modules | **High** | W5, W6 caught |
| | The database libraries only in the data layer; the Clerk SDK only in its adapter locations | **High** | Both guards added this review and proven |
| | Dependencies flow apps, validation, shared; never the reverse; mobile imports no web or server code | **High** | Guard added and proven three ways; mobile imports of web code and the ORM caught; a server secret read in mobile caught (W12) |
| | Ports at replaceable boundaries (Clean Architecture) | **Low** | Three ports exist and two import guards enforce the adapters; the rest are created with their first feature |
| **Database** | Versioned migrations only; `drizzle-kit push` never exposed; unknown history flagged | **High** | W7 and W13 caught |
| | Reset and seed: dev and qa only; never drop or alter migration history | **High** | Two real behavior breaks caught (W8b, W8c) |
| | Transactions limit of the `neon-http` driver is documented | **Medium** | Recorded by a test; the rule documents agree |
| | Destructive migrations need an explicit approval marker | **High** | Guard added; an unapproved DROP fails; the same statement with the marker passes |
| | Every stored column is classified (tier, purpose, retention, deletion path); no restricted data; owner columns declare deletion | **High** | `data-inventory.md` tied to `schema.ts` by a test; five breaks caught |
| | Request-size cap counts bytes | **High** | Four-byte-character body fails; reverting to character counting fails the test |
| | Backups, restore drill, production migration procedure, role separation | **None** | Not done (F-DATA-001, -002, -005) |
| | Neon branches exist as designed | **Low** | Only the default branch is confirmed |
| **UI** | Every control from shadcn/ui; no raw colors | **Medium** | Two ratchet guards proven (downgraded after independent verification: the enforcement covers only part of the rule while exceptions remain); **17 raw controls and 8 raw colors remain by allowance** (issue 91) |
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
| | Documentation matches the code | **Low** | Every document reviewed once; about 25 stale statements fixed; no automatic drift check by decision |
| | Dependency and tooling compatibility | **Low** | Rule written; majors skipped by Dependabot; peer and Expo checks run weekly in `health.yml` but only report (nothing can fail a merge) |
| **Template** | Identity rewrite, leak detection, copy only committed files, generated app passes its own checks | **High** | Several breaks caught; the full generated-app proof re-run found and fixed a real bug |
| | The product features are removed from a generated app | **None** | Gap (independent audit B1) |
| **Legal and risk** | Collection gate, age rule, terms and privacy, deletion and export | **None** | Decided (`risk-and-legal.md`); not built |
| | Compliance applicability, accepted risks, owner actions | **Low** | Documented checklist, not legal advice; owner actions pending |
| | Dependency vulnerabilities known and handled (CVE targets in `secure-coding.md`) | **Low** | Dependabot on; alerts setting pending; `pnpm audit` not in CI |
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

## 4. Independent verification (Fable, 2026-10-09) and what changed

An independent reviewer with no prior knowledge challenged this scorecard by reading the guard tests and the code they protect (it could not run anything). Verdict: the rule set is solid enough to start the first real feature, confidence 70%. Of 16 "High" rows it agreed with 6 and rated 10 as really "Medium", because several scan-style guards were scoped narrower than the rules they claimed. Its three rating changes for the other rows (ports, documentation, dependency compatibility to Low) were fair and are accepted above. Each narrow guard it named was checked against the code (all were true) and widened, then proven again by breaking it.

| Row (Fable's id) | Fable's finding | Fix | Proof |
| --- | --- | --- | --- |
| Secrets (A1) | Skipped test files and several file types; only five key shapes | Scans every text file type including SQL, scripts and tests (fixtures with obvious fake markers are accepted); adds AWS, Google, Slack, Neon and JWT shapes | A key-shaped value in a SQL file fails; a real-looking key in a test file fails; an obviously fake one still passes |
| Test isolation (A5) | The list was checked against itself; mobile tests had no isolation | The expected list is written out in full; the mobile test configuration now uses the same setup | Removing a name fails |
| Route protection (A7) | A second hand-kept list never compared with `proxy.ts` | New test reads the real matcher and requires it to equal the protected directories that exist | A directory marked protected in the test but not in `proxy.ts` fails |
| API routes (A8) | Nothing forced a new API route to use `apiRoute` | New conformance test over every API route file (the 404 catch-all is the one documented exception) | A hand-written handler fails; an arrow function without the wrapper fails |
| Services framework-free (A9) | Scanned only top-level files and single-line imports | Recursive, multi-line aware, with a self-test of the scan | A multi-line import of the framework fails; a Clerk import in a subfolder fails |
| Clerk allow-list (A10) | Allowed the SDK in API routes | API routes removed from the allow-list | Clerk imported in an API route fails |
| Migrations (A11) | Checked journal to files only | Also fails on a SQL file the journal does not list | An unlisted SQL file fails. Residual: `pnpm exec drizzle-kit push` is still possible by hand; the rule is enforced for package scripts only |
| UI (A13) | 17 raw controls remain, so enforcement is partial | Rating lowered to Medium (above) | n/a |
| Docs index (A14) | A file name anywhere in the text counted as linked | A document counts only as a code span or a /docs path | An unlinked document fails; an automation guide dropped from the table fails |
| Template (A16) | Generated-app proof is run by hand | Built: the `Template proof` CI job runs it on every pull request (informational until green for a week); the weekly `health.yml` reports audit, peer and Expo checks with a summary on each run | Job passed on its first real runs |

Fable's other gaps (its Task C) are tracked in `/docs/future-readiness.md` section 5 (with rows for headers and backups above): monitoring and alerting, logging and personal data in logs, dependency licensing, data retention schedule, performance budgets, cross-site request forgery and cookie settings for server actions, backups prioritized above several High rows, and mobile-specific guards (secure token storage, deep links). See `/docs/future-readiness.md` and `/docs/lessons.md`.

Added after the owner's questions on cross-site scripting, framing, API payloads and known and unknown vulnerabilities: the rows for headers, lint rules and hostile payloads above, and `/docs/secure-coding.md`.

## 5. Second independent pass (Fable, 2026-10-09): re-check of its own concerns

Result: **82% confidence** that the rule set is solid enough to start the first real feature (up from 70%). Six of the nine guard fixes were judged satisfied; three were judged partly satisfied with small, bounded gaps; all three rating changes were fair.

| Item | Fable's finding | Fix |
| --- | --- | --- |
| A8 every API route wrapped | The check was per file: one wrapped handler could hide another exported as a plain function | Per-handler check (each exported method must be built by `apiRoute`, directly or by a helper handed `apiRoute`), with a self-test of the scanner; Fable's exact case is now caught. The scanner's first version missed a second unwrapped handler and its own self-test caught that |
| A14 docs index | Matched anywhere in `CLAUDE.md`; product and feature documents not checked | Only the section 3 table counts; `docs/product/` and `docs/features/` are checked. The stricter check found a genuine miss at once (`code-quality-audit.md` was only named in prose); added to the table |
| A16 template proof and health | Stale wording; the weekly workflow could never show a result | Wording corrected above; each weekly run now writes a summary table |
| Most important open item | Backups and a restore drill (F-DATA-002) | Runbook, targets, procedure and an empty drill log in `database.md` section 12.4. **Not proven until a drill is logged**; the plan limits and any spending are the owner's decisions |
