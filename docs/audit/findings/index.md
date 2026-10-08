# Findings Register

One line per finding. The finding's home is `findings/<CODE>.md`; this file never holds detail. Columns are kept few so the table reads on a phone.

Conventions: `methodology.md` section 6. IDs are never reused or renumbered. Merged, rejected, and superseded findings move to the Tombstones table with a pointer.

Subject codes: REQ, ARCH, AUTH, DATA, CODE, UX, TEST, SEC, REL, OPS, DEVOS, BOIL. A subject file exists only once that subject has been examined. Examined so far: SEC, DEVOS, DATA, AUTH, REL, BOIL, ARCH, TEST, OPS, REQ, CODE.

## Active findings

| ID | Title | Sev | Disp | Timing | Status | Issue |
| --- | --- | --- | --- | --- | --- | --- |
| F-SEC-001 | `main` has no technical protection; merge deploys production (U-01) | High | ADD | Now | Draft | |
| F-SEC-002 | Claude job concentrates secrets, write access, and arbitrary code execution | High | IMPROVE | Now | Draft | |
| F-SEC-003 | Repository Actions defaults: token write, PR approval, all actions allowed | Medium | IMPROVE | Now | Draft | |
| F-SEC-004 | No standing dependency or workflow-update control | Medium | ADD | Now | Draft | |
| F-SEC-005 | No security response headers; CSP with real UI | Medium | ADD | Before public launch | Draft | |
| F-SEC-006 | No rate limiting or abuse throttling | Medium | ADD | Before public launch | Draft | |
| F-SEC-007 | Credential lifecycle and emergency access undocumented | Medium | ADD | Before real data | Draft | |
| F-SEC-008 | API body cap measures characters after full buffering | Low | IMPROVE | Trigger: first large-payload write endpoint | Draft | |
| F-SEC-009 | Server boundary, env guards, error redaction | Info | KEEP | n/a | Draft | |
| F-SEC-010 | History has no credentials; secret scanning and push protection on | Info | KEEP | n/a | Draft | |
| F-SEC-011 | Preview deployments behind Vercel Authentication | Info | KEEP | n/a | Draft | |
| F-DEVOS-001 | Neither review step leaves evidence: automated reviewer silent, human review untraceable | Medium | IMPROVE | Now | Draft | |
| F-DEVOS-002 | Documented validation cannot run in the agent job; red CI is not a stop signal | Medium | IMPROVE | Now | Draft | |
| F-DEVOS-003 | Documentation drift is systemic: long, partly duplicated, partly stale, unindexed | Medium | IMPROVE | Now | Draft | |
| F-DEVOS-004 | Documented allow-list rule is self-contradictory and out of step with `claude.yml` | Low | IMPROVE | Now | Draft | |
| F-DEVOS-005 | `docs/notes.md` is a shared mutable file that duplicates GitHub and goes stale | Low | REMOVE | Now | Draft | |
| F-DEVOS-006 | Agent runs have no concurrency control | Low | ADD | Now | Draft | |
| F-DEVOS-007 | Risk-based gates by path (workflows, migrations, authorization) | Low | DEFER | Trigger: first product migration or role-based feature | Draft | |
| F-DEVOS-010 | Issues have no template or shared structure, so "ready" is the author's convention | Low | IMPROVE | Now | Draft | |
| F-DEVOS-008 | Human-only merge, one PR per issue, GitHub-first handoff followed in practice | Info | KEEP | n/a | Draft | |
| F-DEVOS-009 | Process weight right-sized for a team of one; parallel work genuinely used | Info | KEEP | n/a | Draft | |
| F-DATA-001 | No production migration procedure; no route by which any pipeline applies migrations | Medium | ADD | Before real data | Draft | |
| F-DATA-002 | Recovery margin: 6-hour window, no snapshot, unprotected root branch, restore never exercised | Medium | ADD | Before real data | Draft | |
| F-DATA-003 | CI never applies migrations or checks drift; tooling runs only against Neon over HTTP | Medium | ADD | Now | Draft | |
| F-DATA-004 | Destructive-tooling guard trusts a label nothing verifies against the database | Medium | ADD | Before real data | Draft | |
| F-DATA-005 | No evidence of role separation; one credential per branch is the access boundary | Medium | ADD | Before real data | Draft | |
| F-DATA-006 | Branch topology makes `production` the parent of dev, qa and stage | Low | IMPROVE | Before real data | Draft | |
| F-DATA-007 | `db:reset` truncates every table in `public`, including extension-owned tables | Low | IMPROVE | Trigger: first extension installed | Draft | |
| F-DATA-008 | Spatial and search data model undecided; extension availability unverified | Low | DEFER | Trigger: before first event or location table | Draft | |
| F-DATA-009 | No data-lifecycle rules: retention, deletion, export, vendor exit, corruption detection | Low | DEFER | Trigger: first user-owned real data | Draft | |
| F-DATA-010 | Data layer foundations are sound | Info | KEEP | n/a | Draft | |
| F-DATA-011 | Root branch name `production` is documented; nothing depends on it | Info | KEEP | n/a | Draft | |
| F-AUTH-001 | Only ownership is authorized; every signed-in user reaches admin and church areas; role model undecided | Medium | ADD | Before real data | Draft | |
| F-AUTH-002 | Identity lifecycle undefined: bare owner IDs, no user-deleted handling, no webhook pattern | Medium | ADD | Before real data | Draft | |
| F-AUTH-003 | No privacy, data-classification, age or deletion policy though the plan implies sensitive data | Medium | ADD | Before real data | Draft | |
| F-AUTH-004 | No audit trail or moderation accountability for privileged actions | Low | DEFER | Trigger: first real admin or moderator write | Draft | |
| F-AUTH-005 | The mobile authentication path has never carried a real token | Medium | ADD | Before real mobile authentication | Draft | |
| F-AUTH-006 | The `docs/auth.md` appendix is stale in four places | Low | IMPROVE | Now | Draft | |
| F-AUTH-007 | Deleting another user's item answers forbidden, confirming it exists | Low | IMPROVE | Trigger: first resource whose existence is sensitive | Draft | |
| F-AUTH-008 | State-changing API routes depend on cookie SameSite alone against cross-site requests | Low | IMPROVE | Trigger: first real write endpoint | Draft | |
| F-AUTH-009 | Server authentication boundary fails closed, in code and on the deployed site | Info | KEEP | n/a | Draft | |
| F-AUTH-010 | Authorization primitives are small and deny by default; do not replace with a framework | Info | KEEP | n/a | Draft | |
| F-REL-001 | A release is only a merge: Production deployed without its configuration; no deployment check or rollback runbook | Medium | ADD | Before first real users | Draft | |
| F-REL-002 | Every merge redeploys Production and Stage is not provisioned; use manual promotion at the trigger, not a Stage project | Low | DEFER | Trigger: before the first real users | Draft | |
| F-REL-003 | Node and pnpm versions differ between CI, Vercel and the developer machine and are pinned in several places | Low | IMPROVE | Now | Draft | |
| F-REL-004 | Production functions run in US East while the database is in US West | Low | IMPROVE | Before real traffic | Draft | |
| F-REL-005 | Mobile release is scaffold-only: placeholder store identifiers, no accounts, no OTA or minimum-version policy | Low | DEFER | Trigger: first internal or store build | Draft | |
| F-REL-006 | `docs/deployment.md` and `docs/environment.md` describe an environment that does not exist | Low | IMPROVE | Now | Draft | |
| F-REL-007 | The Vercel plan and its terms may not fit a commercial product (unverified) | Low | DEFER | Trigger: before taking payment or public launch | Draft | |
| F-REL-008 | Environment guards, frozen installs, protected Previews and merge-only Production are sound | Info | KEEP | n/a | Draft | |
| F-BOIL-001 | The template machinery blocks product work: its leak check is in the required `Validate` check and fails on ordinary content | Medium | IMPROVE | Now | Draft | |
| F-BOIL-002 | Copy routines include the private local env file and untracked files; the proof script leaves its copy on failure | Low | IMPROVE | Now | Draft | |
| F-BOIL-003 | `prove:init --full` cannot run on Windows and nothing runs it in CI | Low | IMPROVE | Now (if the template stays in use) | Draft | |
| F-BOIL-004 | The published template repository is public, stale, and not marked as a template | Low | IMPROVE | Now | Draft | |
| F-BOIL-005 | Two historical reports and a few stale references add reading weight | Low | REMOVE | Now | Draft | |
| F-BOIL-006 | Init and export design is sound: one manifest, dry run, identity validation, negative controls | Info | KEEP | n/a | Draft | |
| F-ARCH-001 | Conventions expensive to change are undecided: event times and recurrence, idempotency, concurrency, pagination limits, locale, units, money | Medium | ADD | Before first product table or endpoint | Draft | |
| F-ARCH-002 | Client-server compatibility contract is thin: no timeout, no offline versus server error, no client version, no minimum supported version | Low | ADD | Trigger: first real mobile feature | Draft | |
| F-ARCH-003 | `routing.md` and `server-components.md` are empty while pages will start loading real data | Low | DEFER | Trigger: first real-data page | Draft | |
| F-ARCH-004 | Layer boundaries are real and machine-enforced; envelope and error mapping are consistent | Info | KEEP | n/a | Draft | |
| F-TEST-001 | Nothing tests which pages are protected: removing route protection for `/admin` and `/dashboard` passes every test | Medium | ADD | Now | Draft | |
| F-TEST-002 | Tests using real Clerk and a real database are manual and not in CI; the integration of the pieces is unproven | Medium | ADD | Before first product table or endpoint | Draft | |
| F-TEST-003 | Pages are verified only by compilation: no render, accessibility or browser smoke tests | Low | DEFER | Trigger: first real-data page; before public launch | Draft | |
| F-TEST-004 | `docs/testing.md` describes a CI job that does not exist and omits one that runs | Low | IMPROVE | Now | Draft | |
| F-TEST-005 | No flaky-test policy, retry rule, or test-results visibility | Low | DEFER | Trigger: first end-to-end test in CI | Draft | |
| F-TEST-006 | Security-critical logic is well tested and the tests bite; static boundary tests are worth keeping | Info | KEEP | n/a | Draft | |
| F-OPS-001 | No way to know the site is down or failing, and little evidence survives when it does | Medium | ADD | Before first real users | Draft | |
| F-OPS-002 | No incident response, runbooks or kill switches; one person is the whole team | Medium | ADD | Before first real users | Draft | |
| F-OPS-003 | Capacity, performance and cost limits are unknown; public reads are not designed to be cheap | Low | ADD | Before public launch | Draft | |
| F-OPS-004 | Vendor outages and bulk operations have no designed behaviour yet | Low | DEFER | Trigger: first real data path and first real bulk import | Draft | |
| F-OPS-005 | Service targets are not defined and should stay informal until there are users | Info | DEFER | Trigger: first real users | Draft | |
| F-OPS-006 | Failing closed under dependency failure and PII-free error reports are sound | Info | KEEP | n/a | Draft | |
| F-REQ-001 | No acceptance criteria or feature specs, so requirements cannot be traced to a release | Medium | ADD | Trigger: first slice with a real backend | Draft | |
| F-REQ-002 | The owner's accepted product decisions live only in the audit folder | Medium | ADD | Now | Draft | |
| F-REQ-003 | Roadmap and naming documents already disagree with the repository | Low | IMPROVE | Now | Draft | |
| F-REQ-004 | Plan is mobile-first but every delivered slice is a web mock; no product evidence for one platform, three clients | Medium | IMPROVE | Trigger: choosing the first real slice | Draft | |
| F-REQ-005 | Imprecise requirements; nothing records which slice each undecided item blocks | Low | IMPROVE | Trigger: first real slice | Draft | |
| F-REQ-006 | User-generated content and store-policy obligations are not captured as requirements | Medium | ADD | Trigger: first UGC feature or first store submission | Draft | |
| F-REQ-007 | The requirements process and its discipline about undecided items are sound | Info | KEEP | n/a | Draft | |
| F-CODE-001 | The two shared packages, which hold the cross-client rules, are never linted | Low | IMPROVE | Now | Draft | |
| F-CODE-002 | A stray package named `cn` is installed, never imported, and collides with the helper every UI file uses | Low | IMPROVE | Now | Draft | |
| F-CODE-003 | Strict mode is on, but one recommended extra check would flag 29 places | Low | DEFER | Trigger: before the first service that reads real product data | Draft | |
| F-CODE-004 | About 4,500 lines of mock code are labelled, but nothing stops real code importing mock types as contracts | Low | IMPROVE | Trigger: first real slice | Draft | |
| F-CODE-005 | Small, strictly typed code with no type escapes and test-enforced layering | Info | KEEP | n/a | Draft | |

## Tombstones

| ID | Title | Outcome | Pointer |
| --- | --- | --- | --- |
| (none) | | | |

## Counts (updated each pass)

| Severity | Draft | Challenged | Accepted | Rejected/Merged | Deferred |
| --- | --- | --- | --- | --- | --- |
| Critical | 0 | 0 | 0 | 0 | 0 |
| High | 2 | 0 | 0 | 0 | 0 |
| Medium | 28 | 0 | 0 | 0 | 0 |
| Low | 37 | 0 | 0 | 0 | 0 |
| Info | 17 | 0 | 0 | 0 | 0 |
