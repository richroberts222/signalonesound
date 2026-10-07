# Audit Methodology

Version 1.0, Phase 0 output, 2026-10-06. Governs the audit chartered by `/docs/fable-audit-charter.md`.

The charter's mission, scope, fixed technology constraints, recommendation standard, no-implementation rule, and independence rule are unchanged. This document replaces the charter's *proposed method* (passes, artifact structure, record format, convergence) with the method actually used. `phase-0-critique.md` records why each change was made.

---

## 1. Object of the audit

Three things, audited as one system:

1. **Signal One Sound**: the application in this repository (`apps/web`, `apps/mobile`, `packages/*`, `apps/web/db` tooling, `scripts/`), pinned at a baseline commit.
2. **The reusable boilerplate**: the extraction, initialization, export, and leak-check tooling in `scripts/boilerplate/`; the template content of this repository as those tools see it; and the published export `richroberts222/fullstack-boilerplate` (drift check only, section 3).
3. **The development operating system**: `/CLAUDE.md`, `/docs`, the GitHub workflows, repository settings, Vercel/Neon/Clerk/Expo configuration as far as it is visible, and the *observed behavior* of the process in git and GitHub history.

The baseline is the commit recorded in `progress.md`. Every evidence citation is relative to it. Re-baselining is in section 9.

## 2. Principles

* Evidence before opinion. Every finding cites evidence with a grade (section 6).
* Findings are keyed by root cause and live in exactly one place. Passes are events that create, challenge, or change findings; they do not restate them.
* Enforcement over prose. A rule a machine can prove should be proven. A documented rule with no enforcement is recorded as such in the claims ledger, which is the systematic device for the "rules that exist only as prose" concern.
* Severity is tied to a named failure scenario and a timing. Nothing is High because it sounds important, and nothing is Low because it is cheap.
* Depth follows risk (section 4). The audit says up front where it looks hardest.
* Rich reads two documents: `decisions-needed.md` and `roadmap.md`. Everything else exists for traceability and can be long.
* Resumable. Any session, by any model, resumes from `README.md`, `progress.md`, and `findings/index.md`.
* Challenging is mandatory and recorded; agreeing is not evidence of correctness.

## 3. Scope and rules of engagement

### In scope

Everything the charter lists. Specific boundaries the charter leaves open are settled as follows:

| Area | Treatment |
| --- | --- |
| Mock-first product code (Discover, Church, Member, Admin mocks) | Evidence of the patterns the team will replicate. Findings on it are graded at pattern level unless the code is likely to survive into the real implementation (Q-005). Disposable mock code is not graded as production code. |
| Mobile | A foundation shell only. The audit evaluates contract readiness, documented plan, versioning policy, and what is missing before a real client could exist. It does not grade an app that does not exist. |
| Requirements | Audited for precision, internal consistency, testability, completeness relative to the slices being built, and for product decisions the engineering silently depends on. Not audited for market correctness. Items marked UNDECIDED in `/docs/product/product-plan.md` are never resolved by the audit; they become `Q-nnn` entries or are cited as blockers. |
| Exported boilerplate repository | Drift check: a fresh `pnpm export:boilerplate --out=<temp dir>` at the baseline is diffed against the published repository. The export is a derived artifact and gets no second full audit. |
| Git and GitHub history | In scope as behavioral evidence of the operating system: branches per issue, presence of reviews, CI on merges, reverts, time from merge to production. The docs say what should happen; history shows what does. |
| Vendor documentation | May be consulted online to verify a claim about a vendor (for example restore windows, webhook signing). Cited with URL and access date; graded INFER unless the behavior is also observed. |

### Allowed actions

All read-only toward every state outside `docs/audit/`:

* Reading any file in the repository except local environment files.
* Git read commands (`status`, `log`, `diff`, `show`, `branch`, `tag`, `blame`).
* `gh` read commands: `gh api` GET requests, `issue`/`pr`/`run` `view` and `list`.
* Executing, from a clean install: `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test:run`, `pnpm build`, `pnpm audit`, `pnpm test:boilerplate`, `pnpm check:boilerplate`, `pnpm prove:init` (temporary directory), `pnpm export:boilerplate --out=<temporary directory>`.
* Read-only database commands against `dev` only, using the existing local configuration: `db:check`, `db:migrate:status`, `db:migrate:verify`.
* Vercel CLI read-only commands if the project is linked (Q-006); environment variable *names* only, never values.

### Forbidden actions

* Modifying anything outside `docs/audit/`. Defects found in docs or code become findings, not edits.
* Any write to any database: integration tests, Playwright E2E, `db:migrate`, `db:reset`, `db:seed`, `db:refresh`, and anything that creates rows. (Q-003 may relax this for `dev` later; the default is no.)
* Deployments, console setting changes, `gh` mutations (issues, comments, PR creation) except the audit's own PR when Rich asks.
* Installing or upgrading dependencies, even in a temporary directory, except as `prove:init --full` already does in its own temporary copy.
* Opening, printing, quoting, or recording environment values. `apps/web/.env.local` exists on the audit machine and is never opened. If a command output contains a secret, the output is summarized, not recorded.
* Anything with production credentials.

### Secrets

`/CLAUDE.md` section 18 applies to every file here. Evidence that would require quoting a secret is described ("a credential-shaped URL in file X at line N"), never reproduced. The repository's own static security test scans Markdown; the audit must pass it.

### Fixed constraints

As the charter. A belief that a fixed constraint causes a material failure that cannot be mitigated goes to `exception-requests.md` as an `X-nnn` record (section 7), never into a finding's recommendation.

---

## 4. Subjects, lenses, and depth

### Subjects (rows)

Each subject owns one file `findings/<CODE>.md`. Ownership means "the subject that would own the fix". Other subjects cross-reference by ID; they never restate.

| Code | Subject | Primary home for |
| --- | --- | --- |
| REQ | Requirements and product definition | Product plan precision and consistency; feature specs and acceptance criteria; naming; product decisions engineering depends on; requirements-to-release traceability |
| ARCH | Architecture, boundaries, contracts, compatibility | Layer boundaries; shared packages; API design, envelope, versioning and deprecation; web/mobile contract compatibility; idempotency and concurrency semantics; time, identifier and pagination conventions; external dependency failure handling at the design level |
| AUTH | Identity, authorization, privacy, abuse | Clerk integration; session/token handling; authorization model and deny-by-default enforcement; authorization test pattern; webhooks and identity sync; data classification, privacy, consent, deletion/export policy; moderation and abuse controls |
| DATA | Data model and lifecycle | Schema design; migrations (including production procedure and rollback); integrity constraints; transactions; backup, restore, point-in-time recovery and drills; retention; portability and vendor exit for data; least-privilege roles; silent corruption detection |
| CODE | Implementation quality | Web, mobile, and package code; error handling; validation usage; dependency hygiene (unused, odd, or floating packages); code organization; code-quality baseline follow-up |
| UX | UI, accessibility, user experience | Design-system use; accessibility (standards, automation, assistive-technology plan); responsiveness; platform UX conventions; brand consistency |
| TEST | Testing and verification | Test taxonomy and value; flakiness policy; coverage of authentication/authorization/error paths; integration and E2E strategy and their CI story; test environment safety; what the suite would and would not catch |
| SEC | Security engineering | Security headers and CSP; rate limiting; secret handling and credential lifecycle; supply chain (lockfile, pinning, scanning, SBOM/provenance, reproducibility); CI and workflow permissions; AI-agent prompt-injection surface and provenance; emergency access |
| REL | Delivery and release | CI/CD; environments and promotion; Vercel configuration; migrations in the release sequence; rollback and progressive delivery; configuration validation at deploy time; mobile release, signing, store, OTA and minimum-version policy |
| OPS | Operations | Observability (logs, metrics, errors, traces); incident response; SLI/SLO; disaster recovery and runbooks; capacity, performance and cost; vendor outage handling; kill switches; safe bulk operations; operational ownership |
| DEVOS | Development operating system | `/CLAUDE.md` and `/docs` (volume, drift, duplication, authority); issue/PR workflow mechanics versus observed behavior; review discipline and independence; AI-agent governance; Definition of Ready/Done; institutional memory; standards governance |
| BOIL | Reusable boilerplate | Extraction, init, export and leak-check tooling; template boundary (what belongs in every app); generated-app correctness; exported-repository drift; developer experience for a new application; customization map |

Tie-breaks for topics that straddle subjects:

| Topic | Home | Cross-reference |
| --- | --- | --- |
| Least-privilege database roles | DATA | SEC |
| Secrets in GitHub Actions | SEC | DEVOS |
| Webhook signature verification and replay | AUTH | SEC |
| Production migration procedure and rollback | DATA (procedure) | REL (sequencing in a release) |
| Accessibility automation in CI | UX | TEST |
| API versioning for stale mobile clients | ARCH | REL (mobile release policy) |
| Cost of vendors | OPS | SEC for abuse-driven cost |
| Documentation drift about a specific area | the area's subject | DEVOS owns the *systemic* drift problem |
| Dependency anomalies (unused, floating) | CODE | SEC for supply-chain consequences |

### Lenses (columns)

Every subject is examined through every lens:

| Lens | Question |
| --- | --- |
| L1 Drift | Does documentation match implementation and history? |
| L2 Enforcement | Is each rule prose, machine-proven, or process-proven? What would a careless or malicious change get past? |
| L3 Adversary | Active attacker, malicious privileged insider, compromised dependency, prompt injection into the agent. |
| L4 Failure and recovery | What breaks, how is it detected, how is it recovered, what is the blast radius, is restore proven? |
| L5 Scale and cost | One million users, traffic or cost spike, metered vendors, bulk operations. |
| L6 Longevity | Years of operation, original developers unavailable, stale clients, vendor exit, audit request. |
| L7 Compatibility | Web, Android, iPhone; contract evolution; versioning. |
| L8 Simplicity | Overengineering, ceremony, theater, duplication. What should be removed? |
| L9 Boilerplate fit | Belongs in every generated app, Signal One only, or trigger-gated? |

Each subject file ends with a lens matrix: one line per lens listing finding IDs, "examined, nothing material", or "n/a: reason". It is a coverage proof, not prose.

### Depth budget

Initial allocation; revisable in `progress.md` with a stated reason.

| Depth | Subjects | Meaning |
| --- | --- | --- |
| Deep | AUTH, DATA, SEC, REL, DEVOS, BOIL | Every file in the owning area read; every claim in the claims ledger for the area executed or inspected; history queried. |
| Standard | ARCH, TEST, OPS, REQ | All governing docs read; representative source files read; key claims executed. |
| Light | CODE, UX | Governing docs read; sampled files; pattern-level findings. These areas are mostly disposable mocks today. |

---

## 5. Passes

| Pass | Name | Produces | Session rule |
| --- | --- | --- | --- |
| 0 | Methodology | This directory's framework | Done |
| 1 | Baseline | `baseline/*` facts, no findings | 1 to 2 sessions |
| 2 | Subject examinations | `findings/<CODE>.md` drafts, index rows, Q entries, P mappings | One subject per session where practical; commit per subject |
| 3 | Scenario walkthroughs | `scenarios/*.md`, new or cross-referenced findings | Group related scenarios; commit per scenario |
| 4 | Adversarial review | Challenge entries, merges, rejections, calibration, contradiction scan, metrics | **Must start in a fresh session** after Pass 3 is committed |
| 5 | Consolidation | `roadmap.md`, final statuses, convergence check | After Pass 4; loops to targeted Pass 2 or Pass 4 if not converged |

### Pass 1: Baseline (facts only)

No judgments. Outputs:

* `baseline/inventory.md`: components and files per subject with sizes; dependencies with declared ranges; scripts; workflows; tests (count by kind and what each protects); docs (size, last substantive change); results of the allowed validation commands at the baseline (`validate`, `audit`, `check:boilerplate`, `test:boilerplate`, `db:migrate:status` if configured).
* `baseline/claims-ledger.md`: every enforceable claim in `/CLAUDE.md` and `/docs` of the form "X is enforced by Y", "Z refuses W", "CI requires V", "clients cannot U": claim, source location, claimed mechanism, verification method (RUN, READ, CONSOLE, UNVERIFIED), result (Proven, Partially proven, Prose only, Contradicted).
* `baseline/external-state.md`: every external system the platform depends on; what the audit could read (GitHub repository settings, rulesets, secret scanning, Dependabot, Actions runs; Vercel if linked); results with date; and the **UNVERIFIED register**: each item a human must check, with the exact console path and the expected value.
* `baseline/history.md`: process metrics from git and GitHub with the commands used: branches per issue, merged PRs with and without reviews, CI presence on merges, reverts, stale branches, time from merge to production deploy where observable.

Exit: every subject has an inventory section; every claim has a status; every external dependency is listed.

### Pass 2: Subject examinations

For each subject, in depth-budget order (Deep first):

1. Read the governing docs and the owning code at the stated depth.
2. Apply all nine lenses. Draft findings (status Draft) in `findings/<CODE>.md` using the record template (Appendix A). Add index rows.
3. Route product/human decisions to `decisions-needed.md`.
4. Reconcile every `P-nnn` input that touches this subject in `inputs-reconciliation.md` (adopt as a finding, reject with reason, merge). Evidence is gathered *before* the input list for the subject is re-read, to limit anchoring.
5. Complete the lens matrix.
6. Commit; update `progress.md`.

Exit: all twelve subject files exist with complete lens matrices; all P inputs for examined subjects mapped.

### Pass 3: Scenario walkthroughs

Each scenario in Appendix B is walked end to end against the baseline: what happens step by step, where it breaks, which findings already cover each break, what is new. Output: one file per scenario, short (target under 80 lines), referencing finding IDs. New findings are created in their home subject file, never in the scenario file.

Exit: every scenario walked; each references at least one finding or states why none applies.

### Pass 4: Adversarial review

Starts in a fresh session that reads `findings/` first and the Pass 2/3 narrative only afterward. For every finding with severity Medium or above, every finding with disposition ADD, REPLACE, or REMOVE, and every exception request, append a Challenge entry:

```text
Challenge (Pass 4, <date>): verdict Upheld | Downgraded | Upgraded | Rejected | Merged into F-x | Split into F-x, F-y | Reworded
  Strongest case against: ...
  Evidence re-checked: ...
  Result: ...
```

The nine disproof tests from the charter are applied to each: wrong repository assumption; redundant with an existing control; too expensive for the risk; security theater; process theater; incompatible with another recommendation; creates maintenance debt; missing migration or rollback implications; solves a hypothetical while ignoring a current problem.

Also in Pass 4:

* **Calibration**: all Critical and High findings listed side by side and compared; inconsistent severities corrected with a History line.
* **Deduplication** by root cause across subjects; the lower ID survives.
* **Contradiction scan**: pairwise over Accepted-track recommendations for conflicts and ordering constraints; recorded in `progress.md` with resolution or carried to Pass 5.
* **Red flag**: if 100% of challenged findings are Upheld unchanged, that is recorded as a weakness of the pass, and the pass is repeated with a different reading order or a different model (Q-004).

Exit: 100% challenge coverage of eligible findings; metrics in `progress.md`.

### Pass 5: Consolidation and convergence

Resolve contradictions; sequence dependencies; set final statuses; write `roadmap.md` from the index (the roadmap must be derivable from the register; nothing exists only in the roadmap); finalize `decisions-needed.md`; run the convergence check (section 8). If not converged: targeted Pass 2 re-examination of the subjects that churned, then Pass 4 again.

### How the charter's minimum passes are covered

| Charter pass | Where it lives here |
| --- | --- |
| Evidence/baseline | Pass 1 |
| Architecture/product/data | Pass 2: REQ, ARCH, DATA |
| Security/privacy/abuse/supply-chain | Pass 2: AUTH, SEC; Pass 3 attacker and insider scenarios |
| Quality/testing/accessibility | Pass 2: TEST, CODE, UX |
| Release/SRE/recovery/performance/cost | Pass 2: REL, OPS; Pass 3 outage, corruption, spike scenarios |
| Long-term maintenance/mobile compatibility/vendor failure | Lenses L6 and L7 in every subject; Pass 3 years-of-operation, stale-client, vendor-outage scenarios |
| Reusable boilerplate and developer experience | Pass 2: BOIL, DEVOS; lens L9 everywhere |
| Adversarial self-review | Pass 4 |
| Cross-cutting contradiction/dependency | Pass 4 contradiction scan; Pass 5 sequencing |

---

## 5A. Standards and rule-integrity reconciliation gate

Before Pass 5 can converge, the audit must explicitly reconcile the development operating system and every material rule/control against applicable external authority. This is not a citation exercise. Its purpose is to answer both whether the rule is sound and whether the repository actually enforces what the rule claims.

For each material rule or control, record:

1. **Rule correctness** — Is the rule itself sound, current, proportionate, and compatible with Signal One's web, installed-mobile, boilerplate, and solo-owner operating realities?
2. **Authority** — Identify the strongest applicable source class: current final standard; official vendor/platform guidance; established engineering practice where no formal authority governs; or Signal One-specific operating policy. Draft/future standards may inform direction but must not be represented as current final requirements.
3. **Enforcement** — Classify the rule as machine-enforced, externally enforced, process-enforced with observable evidence, prose-only, partially enforced, or contradicted by actual configuration/history.
4. **Drift** — Determine whether docs, code, tests, workflows, repository settings, vendor configuration, and observed history agree. A stale statement must not remain authoritative merely because it is documented.
5. **Conflict** — Where Fabel/audit evidence, an existing Signal One rule, an external authority, vendor guidance, or independent model analyses disagree, record the disagreement and resolve it by evidence and applicability rather than model agreement.
6. **Action** — Classify the result as: correct + enforced (keep); correct + weak/not enforced (add enforcement); incorrect/outdated + enforced (fix rule and enforcement); incorrect/outdated + not enforced (replace/remove); or Signal One-specific with no external authority (justify from engineering evidence and workflow needs).
7. **Verification** — Define how the corrected rule/control will be proven after implementation and how future drift will be detected where practical.

Fabel's findings that rules are weak, contradictory, stale, or only prose are mandatory inputs to this reconciliation and may not be closed merely by adding standards citations. Existing CLAUDE.md and docs material remains in scope even when no external standard speaks to it.

The independent GPT and Claude authority passes must be preserved as independent inputs before comparison. Agreement between models is corroboration, not proof. Primary standards and official vendor sources outrank model judgment for claims they actually govern; repository evidence outranks prose claims about the repository's current state.

**Pass 5 coverage gate:** no Critical/High rule-integrity finding and no material DEVOS/SEC/REL/BOIL rule claim may reach final convergence without this reconciliation. The roadmap must distinguish rule correction from enforcement work so an implementation issue cannot satisfy one while silently leaving the other unresolved.

---

## 6. Finding records

### Identity and lifecycle

* ID: `F-<CODE>-<nnn>`, sequential within the subject, never reused or renumbered. A merged or rejected ID stays in the index as a tombstone pointing to its successor or reason.
* Status: `Draft` (Pass 2/3) → `Challenged` (Pass 4) → `Accepted` | `Rejected` | `Merged → F-x` | `Superseded → F-x` | `Deferred`. After conversion: `Issue #n`.
* Disposition: **KEEP**, **IMPROVE**, **ADD**, **REPLACE**, **REMOVE**, **DEFER**. The charter's four are preserved; ADD (a control that does not exist) and REMOVE (a control, document, or tool that should be deleted) were added because the charter's set only describes existing decisions and the audit is expected to both fill gaps and cut ceremony.

### Scales

**Severity** (consequence at the stated timing):

| Level | Definition |
| --- | --- |
| Critical | A realistic path to breach, data loss, irrecoverable state, production outage, or legal exposure in the *current* operating mode. Note that merging to `main` deploys production today. |
| High | Becomes Critical at the next stage (real user data or public traffic), or defeats a core invariant: human-only merge, no production credentials in automation, server-authoritative rules, clients never touch the database. |
| Medium | A realistic failure with contained blast radius, or a material maintainability or cost drag. |
| Low | Hygiene, clarity, minor inconsistency. |
| Info | KEEP records and observations. |

**Timing**: `Now` | `Before real data` | `Before public launch` | `Trigger: <named condition>` | `Never unless <condition>`. Timing is separate from severity so that a serious-but-not-yet concern is neither inflated nor lost.

**Confidence**: `High` (RUN, READ, or CONSOLE evidence; the full path examined) | `Medium` (partial examination or inference) | `Low` (speculative, or depends on an UNVERIFIED item). A Low-confidence finding cannot be scheduled as Critical or High in the roadmap; it generates a verification item in `baseline/external-state.md` instead.

**Evidence grades**:

| Grade | Meaning |
| --- | --- |
| RUN | A command was executed at the baseline; the command and a summary of its output are recorded. |
| READ | File content inspected at the baseline; cited as `path:line` or `path`. |
| CONSOLE | External state read through an API or CLI, with date. |
| INFER | Deduced from docs, history, vendor documentation, or partial inspection; the inference is stated. |
| UNVERIFIED | Not inspectable by the audit; the exact human verification step is recorded. |

**Effort**: `S` (at most half a day) | `M` (one to three days) | `L` (more, or dependent on a migration or vendor).

**Scope**: `S1` | `BOIL` | `BOTH`.

**Trigger class** (charter): `Foundational` (every generated app) | `S1-specific` | `Before production` | `Sensitive capability` | `Maturity` | `Overengineering now`.

### Deduplication

Before creating a finding, search `findings/index.md` by keyword. Key by root cause; list symptoms inside the finding. Two findings that would be fixed by the same change are one finding.

### Conversion to GitHub issues

A full record is the issue packet: title, Observation plus Consequence become the body, Evidence and Recommendation follow, Verification becomes the acceptance criteria, Depends-on becomes sequencing. The index gets the issue number. The roadmap may bundle several small findings into one issue; bundles are listed there.

Templates: Appendix A.

---

## 7. Other registers

| Register | ID | Content |
| --- | --- | --- |
| `decisions-needed.md` | `Q-nnn` | Question, why the audit cannot decide it, options with consequences, what it blocks, status. |
| `exception-requests.md` | `X-nnn` | Constraint, evidence of material failure, mitigation attempted, alternatives, migration cost and risk, recommendation, Rich's decision. Created only if needed. |
| `inputs-reconciliation.md` | `P-nnn` | Each prior concern the audit was handed, mapped to `Adopted → F-x`, `Rejected (reason)`, `Merged → F-x`, `Not applicable`, or `Pending`. |
| `baseline/external-state.md` | (per item) | Doubles as the UNVERIFIED register with human steps. |
| `progress.md` | (per pass) | Current state; pass log with metrics. The pass log is the change log: each pass lists findings created, changed (old → new), merged, rejected. Per-finding History lines hold the detail. |

---

## 8. Convergence

Convergence is checked in Pass 5 and only after the coverage gates all hold.

**Coverage gates** (all required):

1. Lens matrix complete for all twelve subjects.
2. No claim in the claims ledger without a status.
3. Every scenario in Appendix B walked.
4. Every `P-nnn` input reconciled.
5. Every finding of severity Medium or above has at least one Challenge entry.
6. Every UNVERIFIED item has a human step.

**Stability criteria** (measured per adversarial pass and recorded in `progress.md`):

1. The last two adversarial passes each produced zero new Critical or High findings, and at most three new Medium findings, none architectural. *Architectural* means it changes a layer boundary, a data-model principle, a vendor relationship, or a workflow invariant.
2. Disposition or severity reversals in the last pass affected at most 5% of eligible findings.
3. Zero open contradictions among Accepted recommendations.
4. Every Critical and High finding has an Accepted disposition, verification criteria, sequencing, a scope flag, and either no Q dependency or a Q listed in `decisions-needed.md`.
5. No new Q entry was created in the last pass, or only ones that do not block a Critical or High finding.
6. `roadmap.md` is derivable from `findings/index.md` alone.

**Stop rule**: if three adversarial passes fail to converge, the audit reports the churn to Rich with the list of unstable findings rather than running a fourth pass on its own.

---

## 9. Session and change discipline

* **Start of every session**: read `README.md`, `progress.md`, `findings/index.md`. Verify the branch. Compare `main` to the recorded baseline.
* **Re-baseline procedure** when `main` has moved: record old and new SHA in `progress.md`; run `git diff --stat <old>..<new>`; list touched subjects; mark affected findings `Re-check` in their History line; update evidence citations; record what changed. Only affected findings are re-examined.
* **Commit** after each completed unit (a baseline file, a subject, a scenario, a pass stage), with `progress.md` updated in the same commit. One canonical audit branch and one PR for the whole audit, per `/docs/git-workflow.md`; Claude never merges. Pushing and opening the PR follow Rich's decision in Q-001.
* **Never** edit files outside `docs/audit/` from the audit branch.
* **Writing standard**: terse; evidence-linked; link by path; do not restate documentation; no secrets or credential-shaped strings; dates absolute.
* **Independence**: Pass 4 runs in a fresh session. A second opinion (another model, ChatGPT, or Rich) can be added at any time by appending Challenge entries in the same format; the structure does not change.
* **Honesty**: a command not run is reported as not run. An inference is labelled INFER. A finding whose evidence was lost by a re-baseline is downgraded, not kept on memory.

---

## 10. Deliverables

1. `decisions-needed.md` (continuous).
2. `baseline/external-state.md` UNVERIFIED register (Pass 1, maintained).
3. `findings/index.md` and subject files (Passes 2 to 5).
4. `roadmap.md` (Pass 5): what must be corrected before real production data or users; what should be corrected soon without blocking mock-first discovery; what belongs in the boilerplate; what is Signal One specific; what activates at a trigger; ordering and dependencies; what needs Rich's product, security, or spending approval; how each accepted recommendation is verified.
5. The implementation afterward is decomposed into controlled GitHub issues and executed one slice at a time. The audit does not implement.

Rough size expectation (an estimate, not a commitment): Pass 1 two sessions; Pass 2 roughly one session per subject; Pass 3 two to three sessions; Pass 4 two to three sessions; Pass 5 one to two. Rich can shrink this by narrowing the depth budget.

---

## Appendix A: Record templates

### Full record (anything actionable: IMPROVE, ADD, REPLACE, REMOVE, DEFER, or any Medium or above)

```markdown
### F-SEC-001 Short title in plain words

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | High |
| Confidence | High |
| Timing | Before real data |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence** (grade): `path:line` ... ; command run and result ... ; CONSOLE check dated ...

**Observation**: what exists or is missing, in one paragraph.

**Consequence**: the named failure scenario and who or what is harmed.

**Recommendation**: the specific change.

**Alternatives and tradeoffs**: what else was considered; cost, migration, and new complexity of the recommendation.

**Affects**: files, services, data, clients, workflows.

**Depends on / sequencing**: F-ids, Q-ids, external steps.

**Verification**: how a reviewer proves it is resolved (acceptance criteria).

**Decisions needed**: Q-ids or none.

**Challenge log**: (Pass 4 entries)

**History**: 2026-10-06 created (Pass 2). ...
```

### Short record (KEEP / Info)

```markdown
### F-DATA-003 Short title

KEEP. Evidence (grade): ... Why it is sound: ... Tripwire (what would change this verdict): ...
```

### Decision record

```markdown
### Q-001 Short question

**Question**: ...
**Why the audit cannot decide**: ...
**Options and consequences**: 1. ... 2. ...
**Blocks**: F-ids or audit steps.
**Status**: Open | Answered: <answer, date>
```

### Exception request

```markdown
### X-001 Constraint: <name>

**Claimed material failure**: ... (evidence)
**Mitigations attempted within the constraint**: ...
**Alternatives**: ...
**Migration cost and risk**: ...
**Recommendation**: ...
**Decision**: Pending | Approved | Rejected (Rich, date)
```

### Prior-input row

```markdown
| P-78-M4 | Security headers and baseline CSP | Adopted → F-SEC-002 | Pass 2 |
```

## Appendix B: Scenarios for Pass 3

1. Years of operation: five years in, dependencies two majors behind, original developers unavailable, a new engineer must ship a fix.
2. One million users: discovery traffic, notifications, geospatial queries, cost on metered vendors.
3. Stale mobile clients: an app build from a year ago still calls the API.
4. Active external attacker against the web app and API.
5. Malicious or careless privileged insider (admin, or someone with a dev credential).
6. Compromised dependency or GitHub Action.
7. Prompt injection into the Claude workflow through an issue, PR, or web content.
8. Partial vendor outage: Clerk down; Neon down; Vercel down; each separately.
9. Bad migration or silent data corruption discovered a week later.
10. Account, credential, or key loss: Clerk admin, Neon owner, Vercel owner, GitHub owner, Apple/Google developer accounts.
11. Audit or legal request: data inventory, access logs, deletion proof.
12. Sudden traffic or cost spike (viral event, scraping, abuse).
13. Recovery by an engineer unfamiliar with the system, using only the repository and the consoles.
14. A new application generated from the boilerplate by someone who has never seen Signal One.
