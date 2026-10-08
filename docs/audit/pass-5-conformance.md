# Pass 5: Conformance and coverage

Written 2026-10-08. Three checks the owner and the method require before convergence: (1) the charter, (2) common industry standards, (3) the rule-integrity gate (methodology section 5A). Authority class for the industry names below is **established engineering practice, from recollection and not re-fetched this session**; before any item is cited externally, read the current published text.

## 1. Charter conformance (`/docs/fable-audit-charter.md`)

| Charter requirement | Where met | Status |
| --- | --- | --- |
| Phase 0: critique the charter, design structure, passes, convergence, adversarially review the method | `methodology.md`, `phase-0-critique.md` | Met |
| Evidence-based, live repository, UNVERIFIED with a human step | Every finding carries evidence grades; `baseline/external-state.md` U register | Met; several U items remain open, each with a recorded step |
| Question requirements themselves | REQ subject (F-REQ-001 to 007) | Met |
| Fixed technology preserved; exception requests only with evidence | No exception request was needed; none raised | Met |
| Recommendation standard (KEEP/IMPROVE/REPLACE/DEFER, plus ADD/REMOVE) | Every finding has a disposition and the record fields | Met |
| Finding fields (alternatives, tradeoffs, affects, scope, trigger class, dependencies, verification, decisions) | Template in every finding | Met; verification wording is pattern-level for DEFER items |
| Risk-based, not bureaucracy; six control classes | Trigger class on each finding; Pass 4 over-engineering check cut or deferred 10+ items | Met |
| Existing concerns challenged, not inherited | `inputs-reconciliation.md`: every prior input mapped; several rejected | Met |
| Multi-pass; later passes disprove earlier ones | Pass 2 (12 subjects), 3 (14 scenarios), 4 (37 challenges, 51% changed) | Met; convergence not yet |
| Hostile scenarios | `scenarios/` S-01 to S-14 | Met |
| Convergence defined objectively | `methodology.md` section 8; Pass 4 measured it | Not yet met (see section 4) |
| Transformation roadmap: before production, soon, boilerplate vs Signal One, triggers, order, approvals, verification | `roadmap.md` sections 2 to 7 | Met as a proposal |
| Independence (evidence over agreement) | Pass 4 run by a fresh reviewer with no prior context; 3 of 37 upheld unchanged | Met |
| No implementation during the audit | Audit changed only `docs/audit/`. Separate owner-authorized fixes (Windows tooling, tests, docs) were made outside the audit scope on their own pull requests | Met, with that disclosure |

## 2. Cross-map to common industry standards

| Standard | What it asks of a product like this | Where covered | Gap or note |
| --- | --- | --- | --- |
| OWASP Top 10 A01 Broken Access Control | Deny by default, server-side checks, test them | F-AUTH-001, F-AUTH-010, F-TEST-001 (PR #95) | Role model before real data |
| A02 Cryptographic Failures | TLS, no secrets in code | F-SEC-009, F-SEC-010 | Platform provides TLS |
| A03 Injection | Parameterized queries, input validation | F-DATA-010, F-SEC-009 (ORM, shared validation) | None |
| A04 Insecure Design | Threat modelling, abuse cases | Pass 3 scenarios, F-REQ-006, F-AUTH-003 | Formal threat model is overkill now |
| A05 Security Misconfiguration | Hardened defaults, headers | F-SEC-003, F-SEC-005, F-REL-001 | Headers before public launch |
| A06 Vulnerable Components | Know and update dependencies | F-SEC-004, F-CODE-002 | Update tool is Wave 1 |
| A07 Identification and Authentication Failures | Strong auth, no weak defaults | F-AUTH-009, F-AUTH-011, F-SEC-007 | Two-factor declined by owner (accepted risk) |
| A08 Software and Data Integrity Failures | Pinned actions, reviewed changes | F-SEC-002, F-SEC-004, F-SEC-001 | Ruleset is live; pinning is Wave 1 |
| A09 Logging and Monitoring Failures | Detect and respond | F-OPS-001 (merged with F-OPS-002 into F-SEC-007 for the response page) | Before first real users |
| A10 Server-Side Request Forgery | Do not fetch user-supplied URLs unsafely | None needed today (no server fetches of user input) | Revisit if link previews are added |
| OWASP ASVS (levels) | Verification checklist | Level 1 posture is the realistic target; most items map to the above | Do not chase Level 2 or 3 yet |
| SLSA / NIST SSDF (supply chain) | Protected branch, hermetic-ish builds, pinned inputs, provenance | F-SEC-001 (done), F-SEC-004, F-REL-008 | Signing, SBOM, provenance attestations deferred as overkill |
| WCAG 2.2 AA | Accessible by default | F-UX-002 | Target not yet written into `docs/ui.md` |
| Twelve-factor | Config in the environment, parity, logs as streams, disposable processes | F-SEC-009, F-REL-006, F-DATA-006, F-OPS-001 | Mostly met by the platform |
| DORA delivery measures | Lead time, deploy frequency, change failure, recovery time | F-REL-001 (rollback), F-DEVOS-002 | Do not instrument; one owner |
| Store policies (Apple, Google) | UGC controls, account deletion, privacy declarations | F-REQ-006, F-AUTH-003, F-REL-005 | UNVERIFIED until read at submission time |
| Privacy law (US states, GDPR, minors) | Notice, deletion, consent, age | F-AUTH-003, Q-009 | Counsel review is the owner's action |

## 3. Rule-integrity reconciliation (methodology section 5A)

The claims ledger (`baseline/claims-ledger.md`) holds 68 claims from `CLAUDE.md` and `/docs`. Result groups and the required action:

| Ledger result | Count | Action class | Where handled |
| --- | --- | --- | --- |
| Proven (including unit-level, in code, behavioural variants) | 33 | Correct and enforced: keep | KEEP findings (F-SEC-009, F-AUTH-009, F-TEST-006, etc.) |
| Partial (including Partial / Contradicted) | 13 | Correct but weakly enforced: add enforcement | F-TEST-001, F-UX-001, F-CODE-001, F-DATA-003, F-BOIL-001 |
| Contradicted (including stale or in practice) | 10 | Incorrect or outdated: fix rule and enforcement | F-DEVOS-004, F-REL-006, F-TEST-004, F-AUTH-006, F-REQ-003, F-SEC-002 |
| Prose (no mechanism) | 5 | Add enforcement or remove the claim | F-DEVOS-003, F-DEVOS-010, F-DEVOS-005 |
| Unverified (console state) | 6 | Human step recorded | U register in `baseline/external-state.md` |
| Stale by design | 1 | No action | n/a |

Rule correction and enforcement are separate lines in `roadmap.md` section 6, so an issue cannot satisfy one and silently leave the other.

## 4. Coverage gates and stability (methodology section 8)

| Gate | Status |
| --- | --- |
| 1 Lens matrix complete, twelve subjects | Met |
| 2 Every claim has a status | Met (68 of 68) |
| 3 Every Appendix B scenario walked | Met (14 of 14) |
| 4 Every prior input reconciled | Met (the one stale "Pending" in P-CH-03 was resolved by F-DEVOS-010) |
| 5 Every Medium or above has a Challenge entry | Met (Pass 4) |
| 6 Every UNVERIFIED item has a human step | Met for the recorded items; confirm in the narrow re-check |

| Stability criterion | Status |
| --- | --- |
| 1 Two passes with no new High and at most three new Medium | One pass so far; this pass added 0 Critical, 0 High, 0 Medium |
| 2 Reversals at most 5% of eligible | **Not met** (51% in Pass 4) |
| 3 Zero open contradictions | Resolutions recorded in Pass 4 (nine). Finding bodies not rewritten: this is done by the narrow re-check, which reads each changed finding |
| 4 Every High accepted with verification, sequencing, scope | F-SEC-002 has all fields; status Accepted pending your approval of the roadmap |
| 5 No new blocking question | Q-014 added (non-blocking) |
| 6 Roadmap derivable from the register | Met (`roadmap.md` is built from the index) |

**Verdict:** not yet converged. One narrow adversarial re-check is the next step: the 18 changed items, the six new DEFER dispositions, F-AUTH-011, and the nine contradiction resolutions, from a different reader. If that pass changes fewer than 5% and creates no High, the audit is converged. Per the stop rule, if three passes fail to converge the churn is reported to the owner rather than run again.
