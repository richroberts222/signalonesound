# Roadmap: the short ranked plan

Written 2026-10-08 (Pass 5) from `findings/index.md`. If this file and the register disagree, the register wins. **This is a proposal. Nothing in Stage 3 starts without your OK**, except items already done.

Plain-language summary: the audit looked at 12 areas and wrote 89 findings. A fresh-eyes review (Pass 4) downgraded many of them, leaving 1 High, 16 Medium, 54 Low and 18 Info (keep-as-is notes). Only **one** item is still rated High. The rest is a small amount of cheap tidying now, a **launch gate** (things to finish before real people or real data), and a long list that waits for a specific trigger.

## 0. Already done

| What | Where |
| --- | --- |
| Rules on `main`: pull request required, `Validate` required, no force-push or delete | ruleset "Protect main" (F-SEC-001) |
| Audit files no longer break the template check | #84 |
| Windows test fixes (paths, line endings, template proof) | #88, #93 |
| Misleading historical reports removed | #90 (F-BOIL-005) |

## 1. Waiting for you to merge (each is its own small PR; checked live on 2026-10-08 in Pass 4b: #95, #99 and #101 are green, **#97 is red**)

| PR | Covers |
| --- | --- |
| #95 route-protection test | F-TEST-001 (proven gap) |
| #97 shadcn guard test | F-UX-001 (guard half). Its `Validate` fails in `test:boilerplate`: the new test lists a `components/proof/...` path, which the template leak check classifies as a proof reference. Needs the one-line manifest fix in F-BOIL-001 first, or the path rewritten |
| #99 lint the shared packages | F-CODE-001 |
| #101 stale docs corrected | F-AUTH-006, F-TEST-004, F-REL-006 |

## 2. Wave 1, "Now": small, no product feature code (ranked)

Mostly half-day items. Two are larger: the documentation reconciliation (F-DEVOS-003, about one to three days) and the offline migration drift check (F-DATA-003, the first half is small). Item 7 touches application dependencies and screens and waits for you to lift the app-code pause.

| # | Work | Findings | Needs |
| --- | --- | --- | --- |
| 1 | **Narrow the Claude workflow**: remove the silent reviewer, drop database access and broad commands, pin actions, add an update tool, pin Node. One workflow-edit session. | F-SEC-002 (High), F-SEC-003, F-SEC-004, F-DEVOS-004, F-DEVOS-001, F-DEVOS-002 (documentation first; install step only after the narrowing), F-DEVOS-006 (one-line ride-along), F-REL-003, F-SEC-001 residuals (protect the foundation tag, export the ruleset); Q-007, Q-008 | **You** edit the workflow files (I draft the exact text); a couple of GitHub settings clicks |
| 2 | **Restrict public sign-up** in the Clerk dashboard | F-AUTH-011; Q-014 | Your decision, two minutes in Clerk |
| 3 | **Put your decisions into the real product documents** and fix the roadmap | F-REQ-002, F-REQ-003 | Docs PR |
| 4 | **Documentation reconciliation**: one index, fewer duplicates, issue template | F-DEVOS-003, F-DEVOS-010 | Docs PR |
| 5 | **Offline migration drift check** in `pnpm validate` | F-DATA-003 (first half) | Tooling PR |
| 6 | **Template tidy**: leak check out of the required gate, mark the template repo | F-BOIL-001 (urgent: it is blocking PR #97 now), F-BOIL-002, F-BOIL-003 (only if the template stays in use), F-BOIL-004 | Tooling PR; one GitHub toggle |
| 7 | **Remove the stray `cn` package** and finish the shadcn conversion when app work resumes | F-CODE-002, F-UX-001 (#91) | Waits for you to lift the app-code pause |

## 3. Wave 2, the launch gate: before real users or real data

Not needed while the site is a private preview. Each line is one small piece of work, to be started when you say you are approaching real users.

| Group | Work | Findings |
| --- | --- | --- |
| Data safety | Written production migration procedure; tested restore (one free restore drill); separate database roles per environment; branch layout fix; tooling guard | F-DATA-001, -002, -004, -005, -006 |
| Who can do what | Admin allow-list and church-manager request flow, with a deny-by-default test; privacy notice, age rule, deletion policy | F-AUTH-001, F-AUTH-003 |
| Knowing and fixing | One operations page (incident steps, kill switches, emergency access, credential list); health check and rollback steps; error tracking and an uptime alert | F-SEC-007 (merged with F-OPS-002), F-REL-001, F-OPS-001 |
| Conventions | Decide time zones and recurrence, money, units before the first event table | F-ARCH-001 |
| Quality | Accessibility scan and one screen-reader pass; security headers; region match for database and functions | F-UX-002, F-SEC-005, F-REL-004 |
| Real accounts | Production Clerk instance and domain | F-AUTH-011, F-REL-001 (owner-bought items) |
| Also gate-relevant (listed in Wave 3 by trigger, but check before real users, real data or taking payment) | Release policy before the first real users (F-REL-002); read the Vercel plan terms for a commercial product (F-REL-007); vendor limits and cost alerts (F-OPS-003); vendor-outage behaviour (F-OPS-004); browser and accessibility smoke tests (F-TEST-003); retention, deletion and export (F-DATA-009, with F-AUTH-003); identity lifecycle (F-AUTH-002) and audit trail (F-AUTH-004) at the first user-owned table or admin write; rate limiting and request-forgery posture at the first public write endpoint (F-SEC-006, F-AUTH-008) | F-REL-002, F-REL-007, F-OPS-003, F-OPS-004, F-TEST-003, F-DATA-009, F-AUTH-002, F-AUTH-004, F-SEC-006, F-AUTH-008 |

## 4. Wave 3, triggers only (do nothing until the trigger happens)

| Trigger | Items |
| --- | --- |
| First real product slice | F-REQ-001, F-REQ-004, F-REQ-005, F-CODE-004, F-CODE-003, F-ARCH-003, F-TEST-002 |
| First real write endpoint or data | F-AUTH-008, F-AUTH-002, F-AUTH-007, F-SEC-006, F-SEC-008, F-DATA-009, F-AUTH-004 |
| First location or search table | F-DATA-008, F-DATA-007 |
| First real mobile build | F-REL-005, F-ARCH-002, F-AUTH-005 |
| First user-generated content or store submission | F-REQ-006 |
| Before public launch or taking payment | F-REL-007, F-OPS-003, F-TEST-003, F-OPS-004, F-REL-002 |
| First test of its kind or slice of its kind | F-TEST-005, F-DEVOS-005, F-DEVOS-006 (also a Wave 1 ride-along), F-DEVOS-007, F-OPS-005, F-UX-003, F-UX-004 |

**Owner direction 2026-10-08 (Q-013):** apps are part of launch and are built in parallel with the website through a walking skeleton (one small feature end to end on both clients). The "First real mobile build" triggers above (F-REL-005, F-ARCH-002, F-AUTH-005) therefore move up to the start of the first real slice, and Q-011 (app name and store identity) should be answered before that slice. The owner also uses Preview, not Production, for review.

## 5. What needs your approval

| Kind | Items |
| --- | --- |
| You edit or click | Workflow files; GitHub settings (Actions defaults); Clerk sign-up restriction |
| Spending (not decided; ask before any) | Error tracking service; a paid database plan or point-in-time recovery; a Vercel paid plan if terms require it (F-REL-007); a domain; Apple and Google developer accounts |
| Product decisions still open | Q-013 (website first or apps at launch), Q-014 (sign-up), Q-005 (which mock code survives), Q-011 (mobile app name and store identity) |
| Audit housekeeping questions | Q-003 (may the audit use the dev database), Q-004 (outside second opinion), Q-007, Q-008 (defaults recorded) |

## 6. Rule correction versus enforcement (so neither hides the other)

| Rule | Correction needed | Enforcement needed |
| --- | --- | --- |
| Humans merge; no production credentials in automation | Allow-list wording contradicts `claude.yml` (F-DEVOS-004) | Narrow the job and keep the ruleset (F-SEC-002) |
| Pages are protected | None (the rule is right) | Test (PR #95) |
| shadcn for all controls | None | Guard (PR #97), conversion (#91) |
| Docs describe reality | Fix the stale statements (PR #101, F-DEVOS-003) | Convention in the PR template (F-DEVOS-010); no automated drift check (overkill) |
| Shared code is held to the same bar | None | Lint (PR #99) |

## 7. How each is proven

Every finding carries its own verification step. The pattern for tests is **break it on purpose and watch it fail** (already done for #95, #97, #99). Items that are settings or documents are verified by reading the setting back (`gh api`) or by a text search, and the result is recorded in the pull request.

## 8. Audit status

Pass 4 did not converge (51% of reviewed items changed; the limit is 5%). The narrow re-check (Pass 4b, `pass-4b-review.md`) found 0 reversals among 20 reviewed items, fixed the contradictions in the finding bodies, and corrected this roadmap against the register (three missing findings added, one PR status corrected). Remaining for convergence: your acceptance of the High item (F-SEC-002) and of this roadmap. See `pass-5-conformance.md`.
