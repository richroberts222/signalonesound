# Pass 4b: Narrow Adversarial Re-check

Date 2026-10-08. Independent reviewer with no prior context. Scope: the 18 items Pass 4 changed, the F-OPS-002 merge, F-AUTH-011, the nine contradiction resolutions, and roadmap derivability. Live checks were read-only: `gh api` GETs (rulesets, Actions permissions, repository settings), `gh pr checks` and a failed-log read, `curl` GET/HEAD of the public Production site, grep and file reads. No tests, builds or installs were run. Each reviewed finding has a "Challenge (Pass 4b, 2026-10-08)" entry in its home file.

## 1. Reversals against the 5% limit

* Denominator: 20 (the 18 changed items, the F-OPS-002 merge, and F-AUTH-011 as a new finding). Numerator: 0 verdict changes of severity or disposition.
* Reversal rate 0 of 20 = 0% (limit 5%). Verdicts: 20 Upheld, of which 11 had the finding body reworded to match the Pass 4 outcome (F-SEC-002, F-SEC-007, F-DEVOS-001, -002, F-DATA-004, F-BOIL-001, F-UX-001, F-TEST-002, F-ARCH-002, F-REQ-004, F-OPS-002). No Downgraded, Upgraded or Reversed.
* Tried to disprove the Pass 4 downgrades by looking for a live path to harm. Closest call: F-BOIL-001. PR #97 is red on `Validate` today because the template leak check flags a guard test that lists a `components/proof/...` path, which weakens the Pass 4 premise "fixed structurally". Still Low: one-line manifest fix, no user impact.

## 2. New findings

None. Candidates checked and not raised: the PR #97 failure is F-BOIL-001; production headers (`X-Powered-By`, no frame or content-type headers) are F-SEC-005 (now RUN evidence, not UNVERIFIED); open sign-up is F-AUTH-011 (re-confirmed RUN).

## 3. Contradictions: were the resolutions in both bodies?

Mostly not; only the Challenge entries had them. Bodies rewritten, each with a Pass 4b History line:

| # | Fixed in |
| --- | --- |
| 1 | F-DEVOS-002 recommendation (docs first, install after narrowing); F-SEC-002 sequencing |
| 2 | F-DATA-004 (fingerprint outside `public` and outside the `signalone_tooling` ledger schema, which `db:reset` also truncates; the body also said "a new migration"); F-DATA-007 |
| 3 | F-SEC-007 (carries the merged incident steps and kill switches; own-login advice dropped; pronoun fixed); F-OPS-002 marked |
| 4 | Already consistent (F-DATA-003 and F-DEVOS-007 each state their scope) |
| 5 | F-BOIL-001 (freeze text, Decisions, Timing); consistent with Q-012 |
| 6 | F-AUTH-001 recommendation (3) moved to the first real admin write |
| 7 | F-DEVOS-001 (Q-008 decided: remove; "hence Medium" fixed) |
| 8 | F-DEVOS-002 recommendation and verification, plus three carry-forward lines in DEVOS.md that still demanded the up-to-date option the owner keeps off |
| 9 | F-SEC-002 points 3 to 5 (pinning owned by F-SEC-004; id-token as a test; F-DEVOS-004 governs allow-list) |

Also reconciled: F-AUTH-003 timing text (development instance already open), the REQ-001 / REQ-004 ordering cycle, F-TEST-002 (manual dispatch, not nightly), F-UX-001 (PR #97 is a static test, not ESLint), `progress.md` open-contradictions row.

## 4. Roadmap versus register

Derivation check by script: every non-Info finding id in the register was searched in the roadmap. Missing: F-DEVOS-002 (Now), F-BOIL-003 (Now), F-BOIL-005 (Now, done by #90). Added. Also: F-SEC-001 residuals (tag protection, ruleset export) and F-DEVOS-006 (its trigger is the Wave 1 edit) added to Wave 1 item 1. Every Medium and High is placed in the wave its Timing implies (16 Medium, 1 High). Nothing in the roadmap lacks a finding. Severity totals (1/16/54/18) match the index.

## 5. Central claims

* "Only one item is High": upheld. Under the convention (live now, one step from live, and invariant-defeating) only F-SEC-002 qualifies; I found no second candidate. Open sign-up (F-AUTH-011) is live but defeats no invariant.
* "Now wave is cheap, no product code": mostly. Two items are larger (F-DEVOS-003 is M; F-DATA-003 is M, first half small), and item 7 touches app dependencies and screens. Reworded to "no product feature code" with that caveat. The roadmap also said PRs #95/#97/#99/#101 were all tested and ready; #97 is red. Corrected.
* "Launch gate is complete": no. Wave 2 omitted gate-relevant items parked in Wave 3 by trigger (F-REL-002, F-REL-007 plan terms for a commercial product, F-OPS-003, F-OPS-004, F-TEST-003, F-DATA-009, and first-endpoint items). Added as a Wave 2 addendum row; no severity changed.

## 6. Convergence verdict (methodology section 8)

| Criterion | Status |
| --- | --- |
| Gates 1 to 6 | Not re-audited; no regression seen. Gate 5 holds (every Medium or High has a Challenge entry) |
| 1. Last two passes: no new Critical or High, at most three new Medium | Met (Pass 4: one Low; Pass 4b: none) |
| 2. Reversals at most 5% | Met in this pass (0%); Pass 4 was 51% |
| 3. Zero open contradictions | Met (bodies now match) |
| 4. Every High Accepted with verification, sequencing, scope flag | Pending: F-SEC-002 has all fields (Q-007 listed) but needs the owner's acceptance |
| 5. No new blocking Q | Met |
| 6. Roadmap derivable from the index | Met after the fixes above |

Verdict: converged on stability (criteria 1, 2, 3, 5, 6). Criterion 4 is the owner's step, not another audit pass. **No further adversarial pass is needed.** UNVERIFIED and not examinable here: whether `gh pr merge` works with the agent token, Neon roles and restore state, Clerk dashboard settings, Vercel plan, current `pnpm audit` output.
