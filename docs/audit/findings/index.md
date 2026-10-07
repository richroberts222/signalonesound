# Findings Register

One line per finding. The finding's home is `findings/<CODE>.md`; this file never holds detail. Columns are kept few so the table reads on a phone.

Conventions: `methodology.md` section 6. IDs are never reused or renumbered. Merged, rejected, and superseded findings move to the Tombstones table with a pointer.

Subject codes: REQ, ARCH, AUTH, DATA, CODE, UX, TEST, SEC, REL, OPS, DEVOS, BOIL. A subject file exists only once that subject has been examined. Examined so far: SEC, DEVOS, DATA.

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

## Tombstones

| ID | Title | Outcome | Pointer |
| --- | --- | --- | --- |
| (none) | | | |

## Counts (updated each pass)

| Severity | Draft | Challenged | Accepted | Rejected/Merged | Deferred |
| --- | --- | --- | --- | --- | --- |
| Critical | 0 | 0 | 0 | 0 | 0 |
| High | 2 | 0 | 0 | 0 | 0 |
| Medium | 13 | 0 | 0 | 0 | 0 |
| Low | 9 | 0 | 0 | 0 | 0 |
| Info | 7 | 0 | 0 | 0 | 0 |
