# Pass 4: Adversarial Review

Date 2026-10-08. Reviewer read `findings/` first, then the narrative only for the contradiction scan. Live checks used `gh` GET calls, read-only HTTP requests to the public Production site, grep and file reads. No tests, builds or installs were run, so test-based claims (for example the F-TEST-001 mutation) were corroborated by grep and source, not repeated. Each eligible finding carries a Challenge entry in its home file.

## 1. Calibration

All High findings, before and after:

| Finding | Before | After | Reason |
| --- | --- | --- | --- |
| F-SEC-001 `main` protection | High / ADD | Low / IMPROVE | Ruleset `Protect main` is active and verified (required PR, required `Validate`, force-push and deletion blocked, empty bypass list). Residual: tag protection, export the ruleset. |
| F-SEC-002 Claude job concentration | High / IMPROVE | High / IMPROVE | Kept: the only place the human-only-merge invariant is contradicted by configuration (`gh pr *`, `pnpm *`, floating tags). Narrowed. |

Medium sample, side by side (final severity in bold):

| Finding | Consequence if ignored at its timing | Final |
| --- | --- | --- |
| F-DATA-002 recovery window | Unrecoverable data after 6 hours, at first real data | **Medium** |
| F-AUTH-003 no privacy policy | Sensitive data collected, uncorrectable afterwards | **Medium** |
| F-SEC-004 no dependency control | A runtime advisory goes unnoticed | **Medium** |
| F-TEST-001 page protection untested | An edit exposes `/admin` unnoticed | **Medium** |
| F-SEC-006 no rate limiting | Cost abuse of endpoints that do not exist | Low (was Medium) |
| F-UX-001 shadcn rule violated 19 times | Design drift in mock screens | Low (was Medium) |
| F-TEST-002 real-integration tests manual | Nothing to integrate yet | Low (was Medium) |

Inconsistencies found and what was done:

* The implicit convention was that Medium means "gated by timing" (consequence at a future stage) while High means "live now". It is applied unevenly: F-DATA-002 says "Medium (High once real data exists)" and F-AUTH-003 describes uncorrectable legal exposure, yet both stay Medium, while F-SEC-001 was High before the ruleset. Methodology section 6 defines High as "becomes Critical at the next stage". I did not re-grade them upward (that would inflate every gate item). Recommendation for Pass 5: state the convention in `methodology.md`: severity is the consequence at the current stage, and Timing carries the gate. Under it the Pass 4 downgrades are consistent.
* 13 of 30 Medium findings (43%) were trigger-gated hypotheticals graded Medium. This is systematic, not random: the original grader scored the future consequence.
* Mixed grading of the "Medium (High once ...)" kind is flagged for Pass 5 rather than changed here.

## 2. Deduplication

Merged: **F-OPS-002 into F-SEC-007** (one `docs/operations.md`, one owner action list). Tie-break used for cross-subject merges: the earlier-created finding survives, so evidence and history stay together (SEC was examined first). Recorded in the index Tombstones.

Examined and kept separate, with the owner of each shared mechanism:

* F-REL-001 health route and F-OPS-001 uptime check: one mechanism, owned by F-REL-001 (route) with F-OPS-001 supplying the monitor.
* F-SEC-002 pinning and F-SEC-004 pinning: pinning moves to F-SEC-004 (needs the updater).
* F-AUTH-005, F-REQ-004, F-TEST-002, F-DATA-003 option (c): the real-token test exists once, owned by F-AUTH-005.
* F-AUTH-002, F-AUTH-003, F-DATA-009: one design pass at the first user-owned table; cross-referenced.
* F-REQ-001 and F-DEVOS-010: template (DEVOS-010) versus requirement identifiers and spec (REQ-001). A citation error was fixed: REQ-001 and REQ-003 cited F-DEVOS-004 (the allow-list finding) for the PR template; corrected to F-DEVOS-010 in `REQ.md`.

## 3. Contradiction scan

| # | Pair | Resolution |
| --- | --- | --- |
| 1 | F-SEC-002 shrinks the agent's executable surface; F-DEVOS-002 adds an install step to the same job | Sequence: docs first; install only after F-SEC-002. DEVOS-002 reworded. |
| 2 | F-DATA-004 stores a fingerprint row; F-DATA-007 says `db:reset` truncates every table in `public` | Fingerprint must live outside `public`. Recorded in F-DATA-004. |
| 3 | F-OPS-002 clause "give the partner their own login" versus the owner's accepted shared login (F-SEC-007 History, Q-010 update) | Clause dropped in the merge. |
| 4 | F-DATA-003 (migration CI check, Now) versus F-DEVOS-007 (defer migration gates) | Different controls: machine check now (offline part), path-based review later. Open contradiction in `progress.md` closed. |
| 5 | F-BOIL-001 "freeze the template" versus Q-012 (another app will be built) | Freeze branch withdrawn. |
| 6 | F-AUTH-001 layout changes "now" versus the owner's pause on application code | Layout changes move to the first real admin write; the test (F-TEST-001) proceeds. |
| 7 | F-DEVOS-001 repair-or-remove versus Q-008 (decided: remove) | Collapses to removal. |
| 8 | F-DEVOS carry-forward adds "up-to-date" to F-SEC-001 verification versus the owner's deliberate "off" | Dropped from verification. |
| 9 | F-SEC-002 point 5 versus F-DEVOS-004 (grant `git merge`/`git merge-base`) | DEVOS-004 governs; noted in the F-SEC-002 entry. |

Ordering cycle: F-REQ-001 "depends on" F-REQ-004 and F-REQ-004 "depends on" F-REQ-001. Resolved: Q-013 and the slice choice first, then REQ-004's rule feeds the slice's spec (REQ-001). A softer loop, F-REL-001 needing OPS for alerting and F-OPS-001 needing the REL health route, resolves as route first, monitor second. No other cycle: SEC-001 (done) -> SEC-002 -> SEC-004/SEC-007 -> DATA-005 -> DATA-001; TEST-001 -> AUTH-001; DEVOS-004 with SEC-002.

## 4. Over-engineering check ("safe, but not overkill")

Already cut or deferred by this pass: F-SEC-004a (vendoring shadcn CSS) and the non-blocking audit step; F-REL-001 instrumentation hook and post-deploy workflow; F-ARCH-001 idempotency table, row versions and page-size policy (kept only time, units, money); F-DATA-004 fingerprint (now Low, and constrained); F-TEST-002 nightly workflow (DEFER); F-DEVOS-001 human-review trace; F-DEVOS-005 removal (12 referencing files); disposition ADD to DEFER for F-DEVOS-006, F-ARCH-002, F-OPS-003, F-AUTH-002, F-AUTH-005, F-REQ-006.

Would cut or defer further in Pass 5:

* F-DATA-002 `pg_dump` schedule: keep the free restore exercise now, decide dump-versus-paid-plan at the real-data trigger.
* F-SEC-007 rotation rehearsal and the full credential register: a one-page checklist is enough.
* F-UX-002 axe scan: wait until Playwright runs in CI (F-TEST-003).
* F-OPS-001 error-tracking vendor: authorisation at launch, not before.
* F-DEVOS-003 item (3) as a check: keep as a convention line only.

Would not cut: F-SEC-002, F-SEC-004 (core), F-TEST-001, F-DEVOS-003 items 1, 2, 4, F-AUTH-003 (gate wording), F-REQ-002, F-DATA-003 offline part.

## 5. Convergence assessment (methodology section 8)

| Criterion | Status |
| --- | --- |
| Gate 5: every Medium or above has a Challenge entry | Met (37 entries: 1 High, 16 Medium after calibration, 1 merged, 19 Low with ADD or REMOVE or downgraded) |
| Stability 1: zero new Critical or High, at most three new Medium | Met this pass (one new Low); a single pass is not "last two" |
| Stability 2: reversals at most 5% of eligible | **Not met**: 19 of 37 changed severity, disposition or were merged (51%) |
| Stability 3: zero open contradictions | Not yet: nine found; resolutions recorded in challenge entries but `progress.md` and affected finding bodies are not rewritten |
| Stability 4: every High has Accepted status, verification, sequencing, scope flag | Pending Pass 5 (F-SEC-002 has all fields; status still Challenged) |
| Stability 5: no new blocking Q | Met (no Q created; the production-migration executor is an engineering decision) |
| Stability 6: roadmap derivable from index | Pending Pass 5 |

New material gap created: **F-AUTH-011** (Low, Draft): public sign-up is open on the public Production site while it runs a Clerk development instance, with no terms, privacy notice or age gate (RUN: GET `/sign-up` returns 200, test-type key). Earlier findings framed this as a future gate (F-AUTH-003 "before any public sign-up"); it is a current condition. Found by test 9 (a current problem ignored for a hypothetical).

Other discrepancies, not edited: F-AUTH-001 History says "two admins" while Q-010's update says one shared identity; `progress.md` still reads "Open contradictions: none"; the manifest, ruleset and Dependabot facts were re-read live and match the findings except as changed above.

**Verdict: not converged. Another adversarial pass is needed**, after Pass 5 states the severity convention and applies the contradiction resolutions. Scope it narrowly: the 18 changed items, the six new DEFER dispositions, and F-AUTH-011, using a different reading order or model family. Reason for caution: this pass changed 51% of eligible items, which says the original severity scheme was unstable, not that this pass is final. Not examined and still UNVERIFIED: Neon roles and restore state, Clerk dashboard settings, Production environment variables, Vercel plan and log retention, whether `gh pr merge` works with the agent token, current `pnpm audit` output.

## 6. Metrics

| Measure | Count |
| --- | --- |
| Eligible findings challenged | 37 (2 High, 30 Medium, 5 Low with ADD or REMOVE) |
| Upheld (including 7 narrowed) | 10 |
| Downgraded (14 by severity, 4 by disposition only) | 18 |
| Reworded (severity kept) | 8 |
| Merged | 1 (F-OPS-002 into F-SEC-007) |
| Upgraded, Rejected, Split | 0, 0, 0 |
| Entries that changed something or named a concrete narrowing | 34 of 37 (the other three, F-TEST-001, F-REQ-002, F-BOIL-005, are upheld as written) |
| New findings | 1 (F-AUTH-011) |

| Severity | Before (Pass 3) | After (Pass 4) |
| --- | --- | --- |
| Critical | 0 | 0 |
| High | 2 | 1 |
| Medium | 30 | 16 |
| Low | 39 | 54 |
| Info | 18 | 18 |
| Total active | 89 | 89 (one merged to tombstone, one added) |

The red flag in methodology section 5 (100% Upheld) did not occur.
