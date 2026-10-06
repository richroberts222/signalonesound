# Phase 0: Critique of the Charter and Adversarial Review of the Method

Written 2026-10-06 against `/docs/fable-audit-charter.md` at commit `31ec6ba`. This is the durable record of *why* `methodology.md` differs from the charter's proposal. It is not a findings document; nothing here grades the application.

The charter was read in full, together with `/CLAUDE.md`, the governing docs it references, the three workflows, the boilerplate tooling manifest, the two GitHub issues that produced the charter (#78 and #79), and readable repository settings through the GitHub API. Facts observed during that reading that later passes must not lose are recorded in `progress.md`, not here.

---

## Part 1: What the charter gets right

Listed so that the critique is not mistaken for rejection.

* The mission, independence rule, and "evidence, consequences, tradeoffs, fitness" standard are sound and are kept verbatim in spirit.
* Analysis-first with no implementation is correct for a system that deploys production on merge.
* The fixed-constraint list with a formal exception path is the right balance between freedom to criticize and protection against churn.
* The warning against overengineering and the six-way trigger classification are the most valuable parts of the charter; they are kept as the Trigger class field on every finding.
* Requiring that requirements themselves be audited is unusual and correct.
* Naming the hostile scenarios is better than asking for "risk analysis"; the scenarios are kept and extended by one (a stranger generating a new app from the boilerplate), because the boilerplate is a stated audit object and nothing in the charter's list exercises it end to end.

## Part 2: Weaknesses in the charter and what was changed

Each item: the weakness, why it matters, the change.

### 2.1 The passes are organized by discipline, which produces siloed, duplicated findings

The charter's nine passes are mostly disciplines (security, quality, SRE, maintenance). The same root cause appears in several of them: rate limiting is a security, cost, and operations concern; the production migration procedure is a data, release, and recovery concern. Discipline passes each write their own document, and the same finding is restated three times with slightly different severities.

Change: two axes instead of one list. **Subjects** (what is examined, aligned to how the repository is actually organized) own findings. **Lenses** (how it is examined: drift, enforcement, adversary, failure, scale, longevity, compatibility, simplicity, boilerplate fit) are applied to every subject. A root cause has exactly one home; other subjects cross-reference by ID. A tie-break table settles the predictable straddles. The charter's nine passes are all still covered; the mapping table in `methodology.md` section 5 shows where each lives.

### 2.2 "Separate subject and pass documents" would make passes restate findings

If each pass writes its own document, pass 4 restates pass 2's findings in order to challenge them. Duplication grows with every pass, and the reader cannot tell which copy is current.

Change: findings are entities with a lifecycle; passes are transactions against them. A pass appends Challenge entries and History lines to the finding in its home file, and records metrics and the list of IDs it touched in `progress.md`. The pass log *is* the change log; no separate changelog file exists to drift from the findings.

### 2.3 The finding record has sixteen fields and no scales

Sixteen mandatory fields make every KEEP as expensive as a Critical and encourage padding. "Severity/risk and confidence" are named but not defined, so values would drift across sessions and inflate under the pressure to look exhaustive.

Change: a tiered record (full for anything actionable or Medium and above; a two-line record for KEEP and observations). Defined scales for severity (consequence-based, with "current operating mode" explicitly including the fact that merge to `main` deploys production), timing (separated from severity so a serious-but-not-yet concern is neither inflated nor lost), confidence (tied to evidence grade), effort, scope, and trigger class. A rule that a Low-confidence finding cannot be scheduled as Critical or High: it becomes a verification request instead.

### 2.4 Two dispositions are missing

KEEP, IMPROVE, REPLACE, and DEFER all describe an *existing* decision. The audit is expected to find missing controls and to cut ceremony, and neither fits. Calling a missing control "IMPROVE" and a removal "REPLACE with nothing" hides the two most important categories of outcome.

Change: ADD and REMOVE added. The charter's four are unchanged.

### 2.5 The convergence criteria are qualitative

"Predominantly implementation-level refinements" cannot be checked, and "no new material engineering discipline" depends on who is judging. An auditor under pressure to finish will find convergence when it wants to.

Change: coverage gates that must hold before convergence is even measured (lens matrices complete, claims ledger complete, scenarios walked, inputs reconciled, Medium-and-above all challenged, UNVERIFIED items all have human steps), then countable stability criteria across the last two adversarial passes, plus a stop rule that hands repeated non-convergence to Rich instead of looping.

### 2.6 "Later passes challenge earlier conclusions" is unenforced

The charter says to do it but gives no mechanism, so the adversarial pass can consist of re-reading and nodding.

Change: a mandatory Challenge entry per eligible finding with a verdict, the strongest counter-case, and evidence re-checked; 100% coverage as an exit condition; the nine disproof tests applied explicitly; a fresh-session rule for Pass 4 so the challenge does not run inside the context that produced the findings; and a red flag when every challenge is Upheld, which triggers a repeat with a different reading order or a different model. No reversal quota, because a quota manufactures reversals.

### 2.7 The charter assumes external state cannot be inspected

"Where a conclusion depends on external console state (GitHub, Clerk, Neon, Vercel, app stores, etc.) that cannot be inspected, mark it UNVERIFIED." Much GitHub state *can* be inspected read-only through the API, and it was during Phase 0 (branch protection, rulesets, secret scanning, Dependabot, merged-PR review history). Treating all console state as UNVERIFIED would have left verifiable facts as guesses and handed Rich checks the audit could have done.

Change: five evidence grades instead of two. CONSOLE is a first-class grade. Pass 1 produces `baseline/external-state.md` listing what was read, how, and when, and only the remainder becomes the UNVERIFIED register with exact human steps.

### 2.8 The charter is silent on what the auditor may execute

"Do not modify" is clear; "may run" is not. Without a rule, the auditor either runs nothing (and grades everything INFER) or runs integration tests that write to the dev database. A local `apps/web/.env.local` with real development credentials exists on the audit machine, which raises the stakes.

Change: explicit allowed and forbidden action lists. Read-only commands and the repository's own validation are allowed; any database write, deployment, console change, dependency install, or `gh` mutation is forbidden; the local env file is never opened; secrets are described, never quoted. Relaxation for the dev database is a decision for Rich (Q-003).

### 2.9 The existing-concerns list is an anchoring hazard with no traceability

The charter hands over roughly sixty prior concerns from several sources and says "re-evaluate every one", but gives no way to show that each was considered, and seeding the audit with a checklist biases it toward confirming the checklist.

Change: `inputs-reconciliation.md` gives every prior concern a `P-nnn` ID and requires a disposition (adopted, rejected with reason, merged, not applicable). Pass 2 gathers evidence for a subject *before* re-reading that subject's inputs, then reconciles. Anchoring cannot be eliminated by a single auditor who has already read the inputs; it is reduced by evidence-first drafting and by forcing an explicit decision to reject each input.

### 2.10 Scope boundaries that materially change the work are left open

The charter does not say whether the exported boilerplate repository is in scope, whether git history is evidence, how disposable mock code is graded, how a nonexistent mobile app is graded, or what "audit the requirements" means when the product plan forbids resolving UNDECIDED items.

Change: section 3 of the methodology settles each. The published export gets a drift check, not a second audit. History is behavioral evidence of the operating system. Mocks are graded at pattern level unless they will survive (Q-005). Mobile is graded on contract readiness. Requirements are audited for precision and consistency, not market correctness, and UNDECIDED items are routed to Rich.

### 2.11 The charter ignores that the repository keeps moving

The audit will span many sessions; `main` will move (mock slices continue). Findings pinned to no baseline become unverifiable, and findings pinned to a stale baseline become wrong.

Change: a recorded baseline SHA, evidence cited against it, and a re-baseline procedure that triages only affected findings.

### 2.12 The charter ignores that the auditor loses context between sessions

Nothing in the charter addresses resumption. Without it, each session re-derives the state of the audit, drifts in severity calibration, or repeats work.

Change: `progress.md` as the single resumable state (baseline, current pass and subject, next action, pass log with metrics), a mandatory start-of-session procedure, and commit-per-unit discipline.

### 2.13 The directory name and placement collide with the boilerplate tooling

The suggested `docs/fable-analysis/` is named after a model, and anything under `docs/` is copied by `pnpm export:boilerplate` and rewritten by `pnpm init:app` unless listed in the manifest. `docs/fable-audit-charter.md` itself is not listed (READ: `scripts/boilerplate/manifest.mjs`, `REFERENCE_ONLY_PATHS` and `EXPORT_EXCLUDED_PATHS`), so the charter would already leak into the next export and survive into generated apps with its product name substituted.

Change: the directory is `docs/audit/` (model-agnostic; the charter stays where it is and is linked). The audit cannot edit the manifest under its own rules, so the exclusion is Q-002 for Rich, and the README warns against publishing an export until it is done.

### 2.14 The human reader is not designed for

Rich reviews from a phone. The charter's output is a large register plus a roadmap; nothing says which two documents a human must read and which are traceability.

Change: a stated reading order; `decisions-needed.md` as the only place a question for Rich lives; narrow index columns; short scenario files; pass digests in `progress.md`.

### 2.15 Minor contradictions and gaps

* The charter calls the one-issue/one-branch/one-PR workflow a "current operating constraint" and in the same paragraph allows its mechanics to be changed. The methodology treats the invariants (human-only merge, no production credentials in automation) as fixed and the mechanics as in scope, with history as evidence. Phase 0 observed five remote branches for one issue and two for several others, which is exactly why mechanics must be judged by behavior, not by the rule text.
* "Do not manufacture work to make the audit look exhaustive" and "do not perform one giant pass" pull in opposite directions without a depth rule. The depth budget states where the audit looks hardest and lets Rich shrink it.
* Severity inflation is forbidden but not prevented. The named-failure-scenario requirement and the separate Timing field are the prevention.
* The charter never says who writes the roadmap from what. The methodology makes the roadmap derivable from the index alone, so nothing can exist only in the roadmap.

---

## Part 3: Adversarial review of the method itself

The method above was then attacked as if another team had written it. Each weakness, the fix applied (already in `methodology.md`), or the residual risk accepted.

### 3.1 It is itself a lot of ceremony

Nine lenses times twelve subjects is 108 cells; seven registers; five passes. This is the same bureaucracy the charter warns against.

Fix: the lens matrix is one line per lens, a coverage proof, not prose. Subject files are created only when examined, never as empty shells (the repository's own rule that an empty doc means "no rules" would make them misleading). Phase 0 created seven files, not twenty. `exception-requests.md` and `scenarios/` exist only when needed. Residual: the matrix can still be filled lazily with "examined, nothing material"; the adversarial pass is told to treat an all-clear matrix on a Deep subject as suspicious.

### 3.2 Subject ownership will be argued every time

AUTH versus SEC versus DATA overlap is real, and a finding placed in the wrong file is a finding that gets challenged twice or not at all.

Fix: the "owner of the fix" rule plus the tie-break table for the predictable straddles. Residual: new straddles will appear; the rule is to add a row to the tie-break table, not to debate per finding.

### 3.3 The adversarial pass is the same model in a new session

A fresh session reduces self-agreement but does not create independence. The model has the same blind spots in both sessions.

Fix: the required "strongest case against" field forces the production of a counter-argument rather than a verdict; the 100%-Upheld red flag catches a lazy pass; the Challenge format is model-agnostic so Rich can run it through a different model or ChatGPT without changing anything (Q-004). Residual: true independence requires a second reviewer. The method makes that cheap but cannot supply it.

### 3.4 Convergence metrics can be gamed by not looking

Zero new High findings in a pass is easy to achieve by examining nothing.

Fix: coverage gates are prerequisites, measured separately from stability, so a quiet pass only counts after the matrix, ledger, scenarios, and inputs are all complete. Residual: coverage gates prove breadth, not depth. The depth budget is the only depth control, and it is a stated intention, not a proof.

### 3.5 Severity calibration will drift across twelve sessions

Each subject is examined in its own session with its own sense of "High".

Fix: consequence-based definitions anchored to concrete invariants, and a calibration step in Pass 4 that lists every Critical and High side by side. Residual: Medium and Low will be noisier; they matter less for the roadmap's ordering.

### 3.6 The claims ledger could be enormous

Eight thousand lines of docs contain hundreds of "must" statements.

Fix: the ledger records *enforceable* claims only, those that assert a mechanism ("enforced by test X", "CI requires Y", "refuses Z", "clients cannot W"). Pure guidance ("prefer the simplest implementation") is not a claim about enforcement and is not in the ledger. Residual: the boundary needs judgment; the ledger says which rule was applied.

### 3.7 Anchoring on the prior inputs was not avoided

The author of this method had already read issue #78's findings before designing the method. Several of them (branch protection, floating action tags, the odd `cn` package) were partially verified during Phase 0 out of curiosity. The method's "evidence before inputs" rule is therefore already compromised for the author.

Fix: those early observations are recorded as facts in `progress.md` with their evidence grade, not as findings, so Pass 2 can start from facts rather than from someone's conclusions. Residual: honest acknowledgment is the only mitigation available; the reconciliation table makes the influence traceable.

### 3.8 The audit can break its own rules by accident

Committing audit docs can leak them into the boilerplate export; a pasted command output can contain a credential; a doc fix is tempting when the defect is one character.

Fix: the README carries the export warning and Q-002; the rules of engagement forbid opening the local env file and require summarizing command output; "defects become findings, not edits" is stated three times on purpose. The repository's own static security test scans Markdown and was run against the Phase 0 files. Residual: `check:boilerplate` reports findings by design on this template, so it is not a clean gate for the audit directory; the secret rule rests on the security test and on discipline.

### 3.9 The requirements audit could become product opinion

The auditor is not the product owner, and the product plan forbids resolving UNDECIDED items.

Fix: REQ examines precision, consistency, testability, completeness relative to the slices being built, and engineering dependencies on unmade decisions. Doubts about product direction become Q entries, never findings with severity.

### 3.10 The method could consume more sessions than the audit is worth

Twelve subjects, fourteen scenarios, and up to three adversarial passes is many sessions of an expensive model.

Fix: the size expectation is stated so Rich can decide; the depth budget is the lever (Light subjects are mostly mocks); scenarios may be grouped; the stop rule prevents open-ended looping. Residual: the estimate is a guess and is labelled as one.

### 3.11 The method could stall on Rich

Several Q entries exist already. If Pass 1 waits for answers, nothing happens.

Fix: every Q states what it blocks, and most block nothing in Pass 1. The defaults are conservative (no database writes, no push without a decision) so work proceeds safely without answers. Only Q-001 (where the audit's PR lives) affects delivery, not analysis.

### 3.12 Mock code may be graded unfairly in either direction

Grading disposable mocks as production code inflates; ignoring them misses the patterns that will be copied.

Fix: pattern-level grading with Q-005 asking which mock code is intended to survive. Residual: until answered, CODE and UX findings carry Medium confidence at most.

---

## Part 4: What was deliberately not added

* No script to parse findings into issues. The record format is regular enough to script later; building the script now is the overengineering the charter warns about.
* No per-finding files. Twelve subject files plus an index are readable on a phone and searchable; a hundred small files are neither.
* No separate changelog. The pass log in `progress.md` plus per-finding History lines cover it without a third copy.
* No reversal quota for the adversarial pass. A quota manufactures reversals.
* No new tooling, dependencies, or workflow changes. The audit runs with `git`, `gh`, `pnpm`, and the repository's own scripts.
* No change to the charter file. It stays as the mandate; this directory is the method.
