# Findings Register

One line per finding. The finding's home is `findings/<CODE>.md`; this file never holds detail. Columns are kept few so the table reads on a phone.

Conventions: `methodology.md` section 6. IDs are never reused or renumbered. Merged, rejected, and superseded findings move to the Tombstones table with a pointer.

Subject codes: REQ, ARCH, AUTH, DATA, CODE, UX, TEST, SEC, REL, OPS, DEVOS, BOIL. A subject file exists only once that subject has been examined. Examined so far: SEC, DEVOS.

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

## Tombstones

| ID | Title | Outcome | Pointer |
| --- | --- | --- | --- |
| (none) | | | |

## Counts (updated each pass)

| Severity | Draft | Challenged | Accepted | Rejected/Merged | Deferred |
| --- | --- | --- | --- | --- | --- |
| Critical | 0 | 0 | 0 | 0 | 0 |
| High | 2 | 0 | 0 | 0 | 0 |
| Medium | 8 | 0 | 0 | 0 | 0 |
| Low | 5 | 0 | 0 | 0 | 0 |
| Info | 5 | 0 | 0 | 0 | 0 |
