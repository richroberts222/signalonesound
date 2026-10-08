# Prior Inputs and Their Reconciliation

Every concern the audit was handed before it started, with a stable `P-` ID, so that each can be shown to have been adopted, rejected, merged, or found not applicable. These are **inputs, not conclusions** (charter). Pass 2 gathers evidence for a subject before re-reading that subject's rows here, then fills the Outcome column. Pass 4 re-checks every row.

Outcome values: `Adopted → F-x` | `Rejected (reason)` | `Merged → F-x` | `Not applicable (reason)` | `Pending`.

Sources:

* **78**: the Claude gap analysis posted on GitHub issue #78 (2026-10-06). Its author stated it read some docs in full, only grepped others, ran nothing, and had no console access; evidence grade for all of its claims is therefore INFER until re-verified.
* **CH**: the charter's own list of concerns "raised by prior reviews" (`/docs/fable-audit-charter.md`, "Existing concerns to challenge"). Where a CH item duplicates a 78 item the row says so and the outcome is recorded once, on the 78 row.
* **CQ**: `/docs/code-quality-audit.md` (Issue 61, read-only audit).
* **GAP**: `/docs/boilerplate-gap-report.md` (written at Issue 17; largely historical) and `/docs/boilerplate.md` "Known gaps".
* **SEC**: audit notes recorded in `/docs/security.md` ("GitHub / CI expectations" and "Gaps").
* **RM**: `/docs/product/roadmap.md` "Not yet scheduled" and the data concepts list.
* **NOTES**: unresolved product questions in `/docs/notes.md` (Issue 76).

Likely subject is a routing hint only; the home is decided when a finding is created.

## Issue #78 findings needing a decision first

| ID | Input | Likely subject | Outcome | Pass |
| --- | --- | --- | --- | --- |
| P-78-A | Docs describe a different repository than exists (deployment §7 vs `ci.yml`; testing.md vs Playwright installed; component tests; stale security/gap docs) | DEVOS | Adopted, modified → F-DEVOS-003 (about 11 specific stale points in about 7 documents, not a different repository; 31 ledger claims proven, 13 partial) | 2 DEVOS |
| P-78-B | ~7,800 lines of docs restating each other, no freshness check; consolidate, point docs at tests/scripts | DEVOS | Adopted, modified → F-DEVOS-003 (size confirmed, 8,039 non-audit lines; duplication modest; targeted fixes, a task-to-doc map and a doc-existence tripwire instead of a consolidation project) | 2 DEVOS |
| P-78-C | Security docs list gaps nothing tracks (rate limiting, CSP/headers, audit logging, dependency scanning, CORS, request logging); `next.config.ts` sets no headers | SEC | Merged → F-SEC-005, F-SEC-006, F-SEC-004; request logging and audit logging pending (OPS, AUTH) | 2 SEC |
| P-78-D | `claude.yml`: dev `DATABASE_URL` at job level with `pnpm *`/`npx *` (arbitrary code); trigger on any `@claude` without commenter check (action's own check unverified); floating tags; prompt-injection path with `contents: write` | SEC | Adopted → F-SEC-002 (the commenter-permission claim is Rejected: the action applies a write-permission gate by default, INFER; the residual is vendor risk) | 2 SEC |
| P-78-E | `cn@^0.4.0` dependency possibly stray or typosquat-adjacent; usage unchecked; `pnpm audit` from an earlier issue is not a standing control | CODE | Rejected as typosquat (cn is published by the shadcn-ui org, no install scripts); unused-dependency hygiene → CODE pending; standing audit → F-SEC-004 | 2 SEC |

## Issue #78 MUST-have foundations

| ID | Input | Likely subject | Outcome | Pass |
| --- | --- | --- | --- | --- |
| P-78-M01 | Branch protection/rulesets on `main` (required check, review, no direct push); marked unverified there, **verified absent in Phase 0** (`progress.md` fact 1) | DEVOS/SEC | Adopted, modified → F-SEC-001 (zero required approvals for a single owner) | 2 SEC |
| P-78-M02 | Fix `claude.yml` exposure: scope or remove `DATABASE_URL`, narrow `pnpm`/`npx`, pin SHAs, check `id-token` | SEC | Adopted → F-SEC-002 | 2 SEC |
| P-78-M03 | Dependabot or Renovate plus `pnpm audit` in CI, including Actions updates | SEC | Adopted, modified → F-SEC-004 (non-blocking runtime-path audit; Dependabot for npm and actions) | 2 SEC |
| P-78-M04 | Security headers and baseline CSP (Clerk allowances), tested in Preview | SEC | Adopted, modified → F-SEC-005 (headers now; CSP report-only with the real UI) | 2 SEC |
| P-78-M05 | Restore drill: document and exercise one Neon point-in-time restore; confirm PITR window | DATA | Adopted, modified → F-DATA-002 (restore drill plus a free logical dump) | 2 DATA |
| P-78-M06 | Production migration procedure: who, how, verification | DATA | Adopted → F-DATA-001 | 2 DATA |
| P-78-M07 | Error monitoring and structured logs with redaction | OPS | Adopted → F-OPS-001 | 2 OPS |
| P-78-M08 | Rate limiting on `/api/v1` and auth-adjacent routes | SEC | Adopted, modified → F-SEC-006 (platform rate limit first; no new vendor) | 2 SEC |
| P-78-M09 | Lazy env validation ships a broken prod env green; add post-deploy smoke check or health route | REL | Adopted, modified → F-REL-001 | 2 REL |
| P-78-M10 | Privacy basics before collecting member data: policy, terms, data inventory, deletion/export decision | AUTH | Adopted → F-AUTH-003 | 2 AUTH |
| P-78-M11 | Automated accessibility check (jsx-a11y lint, axe in Playwright on key pages) | UX | Pending | |
| P-78-M12 | Transaction decision: `neon-http` lacks interactive transactions vs `data-mutations.md` requirement | DATA | Resolved → F-DATA-010 (`AtomicRunner`, `db.batch`; limit recorded) | 2 DATA |
| P-78-M13 | Deny-by-default authorization test pattern in the service layer before the first role-based feature | AUTH | Adopted → F-AUTH-001 | 2 AUTH |
| P-78-M14 | Clerk-to-Neon webhook handling if app data keys off users: signature, idempotency, replay | AUTH | Adopted, modified → F-AUTH-002 | 2 AUTH |
| P-78-M15 | Least-privilege DB roles (separate migration and runtime users) | DATA | Adopted → F-DATA-005 (Low confidence until roles are read) | 2 DATA |

## Issue #78 later maturity practices (trigger-gated)

| ID | Input | Likely subject | Outcome | Pass |
| --- | --- | --- | --- | --- |
| P-78-T01 | Audit log of privileged actions (first admin/moderator role) | AUTH | Deferred → F-AUTH-004 | 2 AUTH |
| P-78-T02 | Feature flags, staged rollout (first real cohort or risky release) | REL | Rollback part → F-REL-001; feature flags and staged rollout deferred (no cohort exists) | 2 REL |
| P-78-T03 | Real Stage environment (before first production launch with real data) | REL | Deferred, modified → F-REL-002 (manual promotion, no Stage project) | 2 REL |
| P-78-T04 | Mobile release engineering: signing, store review, OTA, minimum API version; API deprecation rules | REL/ARCH | REL part adopted → F-REL-005; API deprecation stays with ARCH | 2 REL |
| P-78-T05 | Accessibility audit with assistive technology (pre-launch) | UX | Pending | |
| P-78-T06 | SBOM/provenance, gitleaks, CodeQL after M03; enable GitHub secret scanning now (**verified enabled in Phase 0**, `progress.md` fact 2) | SEC | Merged → F-SEC-004 (SBOM/provenance and CodeQL DEFER with triggers; gitleaks Rejected: push protection enabled and history scan clean, F-SEC-010) | 2 SEC |
| P-78-T07 | Uptime monitoring, status page, alert routing, on-call (first production traffic) | OPS | Uptime and alert → F-OPS-001; status page and on-call deferred (F-OPS-002) | 2 OPS |
| P-78-T08 | Load/performance budgets, Core Web Vitals (before public launch) | OPS | Informal targets → F-OPS-005; baseline → F-OPS-003 | 2 OPS |
| P-78-T09 | Cost budgets and alerts on Vercel, Neon, Clerk (before launch) | OPS | Adopted → F-OPS-003 | 2 OPS |
| P-78-T10 | Vendor-outage runbook; cached/static read path for public discovery | OPS | Adopted → F-OPS-002, F-OPS-003, F-OPS-004 | 2 OPS |
| P-78-T11 | Data retention and data-subject request automation | AUTH/DATA | Adopted → F-AUTH-003 (data side F-DATA-009) | 2 AUTH |
| P-78-T12 | Second-region or multi-cloud DR (not foreseeable) | OPS | Rejected: not foreseeable (agreed) | 2 OPS |

## Issue #78 overengineering flags and removals

| ID | Input | Likely subject | Outcome | Pass |
| --- | --- | --- | --- | --- |
| P-78-O01 | Documentation volume and process weight (orchestrator rules, serialized merges, revalidation of open PRs) heavy for a single reviewer; keep invariants, cut the rest | DEVOS | Merged → F-DEVOS-003 (volume) and F-DEVOS-009 (process weight is right-sized; the cost is documentation volume, not ceremony) | 2 DEVOS |
| P-78-O02 | Test Value Review for every new test discourages tests; replace with a short rubric | TEST | Rejected as stated (no evidence of suppressed tests); gap is F-TEST-001 | 2 TEST |
| P-78-O03 | Parallel-work ceremony; default to sequential | DEVOS | Rejected (two real parallel batches on 2026-10-01; the rules govern actual throughput; the missing control is "require up to date", F-DEVOS-002, F-DEVOS-009) | 2 DEVOS |
| P-78-O04 | Boilerplate export/init tooling, three reports, markers inside product docs: verify how many apps will be created; freeze if fewer than two | BOIL | Adopted → F-BOIL-001, Q-012 | 2 BOIL |
| P-78-O05 | `docs/ideas/` fine as parking lot; session replay/analytics carry privacy implications | AUTH/DEVOS | DEVOS part: Not applicable (`docs/ideas/` is 5 files, 125 lines; no volume problem); privacy part → F-AUTH-003 | 2 DEVOS (partial) |
| P-78-O06 | Static source-text security tests give false confidence; prefer linter boundary rules | TEST/SEC | Modified → F-TEST-006 (static tests bite; lint rules only on a miss) | 2 TEST |
| P-78-O07 | `APP_ENV` plus `DATABASE_ENV` plus four environments with unprovisioned Stage is more than needed; do not build Stage until M01 to M09 | REL | Agreed in part → F-REL-002 | 2 REL |
| P-78-O08 | Team-of-one: no reviewers, CODEOWNERS, multi-approver rules yet | DEVOS | Adopted as KEEP → F-DEVOS-009 (none exist; correct); path-based gates deferred, F-DEVOS-007 | 2 DEVOS |
| P-78-K | Keep as-is: explicit environment identity and prod-refusal guards; server-only imports; Zod at boundaries; forward-only migrations with expand/contract; per-environment secrets; no merge rights for the agent; never-commit-secrets tests | several | Partly KEEP → F-SEC-009, F-SEC-010; "no merge rights for the agent" modified (DEVOS): held behaviorally, 38 of 38 merges by the owner, F-DEVOS-008 KEEP, but not technically enforced, F-SEC-001, F-SEC-002; remaining items pending DATA, ARCH | 2 SEC, 2 DEVOS (partial) |

## Charter concern list ("raised by prior reviews")

| ID | Input | Likely subject | Duplicates | Outcome | Pass |
| --- | --- | --- | --- | --- | --- |
| P-CH-01 | Requirements-to-release traceability | REQ/DEVOS | | DEVOS part: PR to issue links work through GitHub; nothing to trace to because no feature spec exists (`features/README.md` is 13 lines); remainder pending REQ | 2 DEVOS (partial) |
| P-CH-02 | Independent diff review | DEVOS | P-78-M01, P-78-O08 | Merged → F-DEVOS-001 (no independent reviewer exists or is needed for one owner; the automated reviewer is silent and must be repaired or removed, and described as an aid) | 2 DEVOS |
| P-CH-03 | Definition of Ready / Done | DEVOS | | Done: Rejected as new ceremony; `product-development.md` section 9 exists and its provable parts are covered by F-DEVOS-002 and F-SEC-001. Ready: Pending (issue bodies not readable in the DEVOS session; see `progress.md` open items) | 2 DEVOS (partial) |
| P-CH-04 | Risk-based gates | DEVOS/REL | | Merged → F-DEVOS-002 (general gate) and F-DEVOS-007 (path-based gates, DEFER with trigger) | 2 DEVOS |
| P-CH-05 | Threat / abuse modeling | AUTH/SEC |  | Partly covered by F-SEC-002 and F-SEC-006 (attack paths); AUTH part → F-AUTH-001, -004, -008; the formal threat and abuse model stays with Pass 3 scenarios | 2 SEC |
| P-CH-06 | Authorization matrices and deny-by-default server enforcement | AUTH | P-78-M13 | Adopted → F-AUTH-001 | 2 AUTH |
| P-CH-07 | Data classification, lifecycle, privacy | AUTH/DATA | P-78-M10, P-78-T11 | Adopted → F-AUTH-003 | 2 AUTH |
| P-CH-08 | Migrations, backup and tested restore | DATA | P-78-M05, P-78-M06 | Adopted → F-DATA-001, F-DATA-002, F-DATA-003 | 2 DATA |
| P-CH-09 | Idempotency and concurrency | ARCH/DATA | P-78-M12 | Adopted → F-ARCH-001 (DATA part earlier: F-DATA-010) | 2 ARCH |
| P-CH-10 | Time and identifier conventions | ARCH | | Adopted → F-ARCH-001 | 2 ARCH |
| P-CH-11 | External dependency failure handling | ARCH/OPS | P-78-T10 | Client side → F-ARCH-002; server side → F-OPS-004 | 2 ARCH, 2 OPS |
| P-CH-12 | Upload, notification, search, geospatial contracts | ARCH/REQ | | Trigger-gated list inside F-ARCH-001; geospatial → F-DATA-008 | 2 ARCH |
| P-CH-13 | Test taxonomy and flaky-test policy | TEST | | Adopted, deferred → F-TEST-005 | 2 TEST |
| P-CH-14 | Accessibility | UX | P-78-M11, P-78-T05 | Pending | |
| P-CH-15 | Performance, capacity, cost | OPS | P-78-T08, P-78-T09 | Adopted → F-OPS-003 | 2 OPS |
| P-CH-16 | SLI/SLO and incident response | OPS | P-78-T07 | Adopted → F-OPS-002, F-OPS-005 | 2 OPS |
| P-CH-17 | Supply-chain security, SBOM, provenance | SEC | P-78-M03, P-78-T06 | Merged → F-SEC-004 (SBOM/provenance DEFER) | 2 SEC |
| P-CH-18 | Progressive delivery and rollback | REL | P-78-T02 | Adopted → F-REL-001, F-REL-002 | 2 REL |
| P-CH-19 | AI-agent prompt/context safety and provenance | SEC/DEVOS | P-78-D, P-78-M02 | Merged → F-SEC-002 | 2 SEC |
| P-CH-20 | Standards governance | DEVOS | | Merged → F-DEVOS-003 (claims name a mechanism or say "convention"; doc-existence tripwire; ADRs rejected as ceremony for one decision-maker) | 2 DEVOS |
| P-CH-21 | Long-term compatibility | ARCH | P-78-T04 | Adopted → F-ARCH-002 | 2 ARCH |
| P-CH-22 | Reproducible builds | SEC/REL |  | Rejected as a finding for now (frozen lockfile, pinned pnpm; floating Node minor in CI is Low); re-opened narrowly in REL → F-REL-003 (Node and pnpm pins) | 2 SEC |
| P-CH-23 | Configuration validation | REL | P-78-M09 | Adopted → F-REL-001 | 2 REL |
| P-CH-24 | Operational ownership | OPS | | Adopted → F-OPS-002 | 2 OPS |
| P-CH-25 | Institutional-memory survival | DEVOS | | Merged → F-DEVOS-003 (task-to-doc map; about 63,000 tokens of required reading), F-DEVOS-005 (the memory file is overwritten per slice), and F-SEC-007 (single owner, credentials) | 2 DEVOS |
| P-CH-26 | Emergency access recovery | SEC/OPS |  | Merged → F-SEC-007 | 2 SEC |
| P-CH-27 | Credential and key lifecycle | SEC |  | Merged → F-SEC-007 | 2 SEC |
| P-CH-28 | Silent data-corruption detection | DATA | | Deferred → F-DATA-009 | 2 DATA |
| P-CH-29 | Blast-radius containment | SEC/OPS | P-78-M15 | Partly → F-SEC-001, F-SEC-002 (agent blast radius); DB roles pending DATA | 2 SEC |
| P-CH-30 | Vendor exit and data portability | DATA/OPS | | Deferred → F-DATA-009; dump in F-DATA-002; topology F-DATA-006 | 2 DATA |
| P-CH-31 | Operational kill switches | OPS | | Adopted → F-OPS-002 | 2 OPS |
| P-CH-32 | Safe bulk operations | OPS/DATA | | Adopted, deferred → F-OPS-004 | 2 OPS |
| P-CH-33 | Legal and compliance triggers | AUTH/REQ | P-78-M10 | Adopted → F-AUTH-003 (counsel review is the owner's action) | 2 AUTH |
| P-CH-34 | Charter restatement of the previous Claude audit (drift and duplication; security as prose; workflow permissions; floating tags; `cn`; branch protection; dependency scanning; CSP/headers; untested restore; prod migration; monitoring; rate limiting; lazy env validation; privacy decisions; accessibility enforcement; transactions; authorization tests; webhook integrity; least-privilege roles) | several | P-78-A to E, M01 to M15 | Covered by the 78 rows | |
| P-CH-35 | Charter restatement of overengineering warnings (doc/process ceremony, bureaucratic tests, premature parallel work, premature environments, team-scale controls) | several | P-78-O01 to O08 | Covered by the 78 rows | |

## Code-quality audit (Issue 61)

| ID | Input | Likely subject | Outcome | Pass |
| --- | --- | --- | --- | --- |
| P-CQ-F1 | Raw palette colors instead of semantic tokens; no `success`/`warning` token | UX | Pending | |
| P-CQ-F2 | Proof panel hand-builds form controls instead of shared primitives (note: `components/ui/input.tsx` now exists) | UX | Pending | |
| P-CQ-F3 | Brand text duplicated; shortened product name in copy; no brand asset (note: `components/brand/brand-wordmark.tsx` now exists) | UX | Pending | |
| P-CQ-F4 | Mobile uses literal style values; no mobile theme module | UX | Pending | |
| P-CQ-P1 | Services import `DatabaseError`/`Database` type from `db/`; documented as acceptable; open question only if services move to a shared package | ARCH | Resolved → F-ARCH-004 (type and error class only) | 2 ARCH |
| P-CQ-P2 | `packages/shared/src/env.ts` size (cohesive; no action) | CODE | Pending | |
| P-CQ-P3 | Uncommented `* 2` looseness on client `maxLength` | CODE | Pending | |

## Boilerplate gap report and known gaps

| ID | Input | Likely subject | Outcome | Pass |
| --- | --- | --- | --- | --- |
| P-GAP-01 | No real Clerk-authenticated mobile call exists | ARCH/AUTH | Adopted → F-AUTH-005 | 2 AUTH |
| P-GAP-02 | No CI job for integration/E2E (needs secrets) | TEST/REL | Not REL: routed to TEST → F-TEST-002 | 2 REL, 2 TEST |
| P-GAP-03 | Stage hosting mechanism undecided | REL | Deferred → F-REL-002 | 2 REL |
| P-GAP-04 | Production migration procedure not automated or defined | DATA | Adopted → F-DATA-001 | 2 DATA |
| P-GAP-05 | `docs/deployment.md` section 7 stale about `ci.yml` | DEVOS | Adopted → F-DEVOS-003 (confirmed, ledger C-22; fix in the reconciliation slice) | 2 DEVOS |
| P-GAP-06 | `neon-http` cannot do interactive transactions; decision needed before first mutation feature (historical; check current `AtomicRunner`) | DATA | Resolved → F-DATA-010 | 2 DATA |
| P-GAP-07 | `APP_ENVS` in shared duplicates `DATABASE_ENVS` in `apps/web/db/env.ts` (historical; check whether consolidated) | CODE | Pending | |
| P-GAP-08 | Package scope `@signalone/*` embeds the application name (addressed by init `--scope`; verify) | BOIL | Resolved → F-BOIL-006 | 2 BOIL |
| P-GAP-09 | Boilerplate maintenance rules: proof paths manifest, markers, `prove:init --full` only on material change; re-export whenever the foundation changes (**export not refreshed since 2026-10-01**, `progress.md` fact 5) | BOIL | Adopted → F-BOIL-004, F-BOIL-001 | 2 BOIL |

## Security doc audit notes

| ID | Input | Likely subject | Outcome | Pass |
| --- | --- | --- | --- | --- |
| P-SEC-01 | `DATABASE_URL` (dev) at job level in `claude.yml`; scope to steps or drop | SEC | Adopted → F-SEC-002 | 2 SEC |
| P-SEC-02 | `Bash(pnpm *)`/`Bash(npx *)` broad | SEC | Adopted → F-SEC-002 (stronger: also the gh pr wildcard) | 2 SEC |
| P-SEC-03 | `id-token: write` in both workflows; confirm needed | SEC | Adopted → F-SEC-002 (verify, do not assume removable) | 2 SEC |
| P-SEC-04 | Floating action tags; pin to SHAs | SEC | Adopted → F-SEC-002, F-SEC-004 | 2 SEC |
| P-SEC-05 | `claude-code-review.yml` has read-only permissions (recorded as correct) | SEC | Confirmed correct (read-only contents, PRs, issues; carries id-token write); no finding | 2 SEC |
| P-SEC-06 | Gaps: rate limiting, security headers/CSP, audit logging, automated dependency scanning; API: no rate limiting, CORS, request logging | SEC | Merged → F-SEC-004, F-SEC-005, F-SEC-006; CORS not needed for native clients (INFER, ARCH); audit → F-AUTH-004; logging pending OPS | 2 SEC |
| P-SEC-07 | Least-privilege roles recommended, not configured | DATA | Adopted → F-DATA-005 | 2 DATA |
| P-SEC-08 | Static source-text security checks do not follow transitive imports; `server-only` is the build-time backstop | TEST/SEC | Recorded as a limit → F-TEST-006 | 2 TEST |

## Roadmap and notes (product inputs that engineering depends on)

| ID | Input | Likely subject | Outcome | Pass |
| --- | --- | --- | --- | --- |
| P-RM-01 | Not yet scheduled: real roles and authorization, Church-managed data, real submission flow, real admin entry, bulk ingestion, multiple users per organization, product schema | REQ/AUTH/DATA | AUTH part adopted → F-AUTH-001; product questions → Q-010 | 2 AUTH |
| P-RM-02 | Data concepts surfaced by the admin mock: provenance, moderation decisions, duplicate/conflict rules, organization-manager relationships, import batches, lifecycle states, audit/history, orphan events | REQ/DATA | Pending | |
| P-NOTES-01 | Unresolved product questions from Issue 76: who is an admin/moderator and how granted; anonymous submissions; moderation outcomes and reversibility; duplicate/conflict definition and precedence; imports creating organizations; staff editing manager records; permanent vs reversible removal | REQ/AUTH | Routed → Q-010, F-AUTH-001, F-AUTH-004 (AUTH); REQ part pending; these still need a durable home before F-DEVOS-005 removes `notes.md` | 2 AUTH (partial) |
| P-NOTES-02 | Verification not performed on Issue 76: Playwright, root `pnpm validate`, browser rendering, iPhone Safari | TEST | Adopted → F-TEST-003 | 2 TEST |
