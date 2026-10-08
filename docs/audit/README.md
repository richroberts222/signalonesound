# Platform Audit (Signal One Sound, boilerplate, development operating system)

This directory is the durable record of the exhaustive audit chartered by `/docs/fable-audit-charter.md`. It holds analysis only. Nothing here changes application behavior, and the audit never modifies files outside this directory (see `methodology.md` section 3).

Started 2026-10-06 at baseline commit `31ec6ba` (`main`). The current baseline is always the one recorded in `progress.md`.

## What is in here

| File | Purpose | Written in |
| --- | --- | --- |
| `methodology.md` | The operating method: scope, rules of engagement, subjects, lenses, passes, record standards, scales, convergence criteria, session discipline. Authoritative over the charter's *method* (not its mission or constraints). | Phase 0 |
| `phase-0-critique.md` | Why the method differs from the charter's proposal: weaknesses found in the charter, the adversarial review of the method itself, residual risks accepted. | Phase 0 |
| `roadmap.md` | The short ranked plan for the owner: done, waiting, Wave 1 now, launch gate, triggers, approvals. Derived from the register. | Pass 5 |
| `pass-5-conformance.md` | Charter conformance, industry-standards cross-map, rule-integrity summary, coverage gates and stability status. | Pass 5 |
| `pass-4-review.md` | The adversarial review: calibration, deduplication, contradictions, over-engineering check, convergence assessment. | Pass 4 |
| `scenarios/` | Fourteen scenario walkthroughs (Pass 3). | Pass 3 |
| `progress.md` | Resumable state: current baseline, current pass and subject, pass log with metrics (this is also the change log), facts observed early that later passes must not lose. | Every session |
| `decisions-needed.md` | `Q-nnn` questions only Rich can answer, with what each one blocks. | Any pass |
| `inputs-reconciliation.md` | `P-nnn` inventory of every prior concern the audit was handed, and what became of each (adopted, rejected, merged). | Phase 0 inventory; mapped in Passes 2 to 4 |
| `findings/index.md` | One line per finding: the register. Tombstones for merged or rejected IDs. | Passes 2 to 5 |
| `findings/<CODE>.md` | The home of each finding, one file per subject (REQ, ARCH, AUTH, DATA, CODE, UX, TEST, SEC, REL, OPS, DEVOS, BOIL). Created when the subject is examined, never empty. | Pass 2 onward |
| `baseline/` | Pass 1 facts: inventory, claims ledger (every rule that claims enforcement, and whether it is), external console state (and the UNVERIFIED register), process history metrics. | Pass 1 |
| `scenarios/` | Pass 3 hostile-scenario walkthroughs, one short file each. | Pass 3 |
| `exception-requests.md` | `X-nnn` requests to reconsider a fixed technology constraint. Created only if one is ever needed. | If needed |
| `roadmap.md` | The prioritized transformation roadmap, derived entirely from the findings register. | Pass 5 |

## Reading order for Rich

1. `decisions-needed.md`: what only you can answer.
2. `roadmap.md` (once it exists): what to do, in what order, what blocks what.
3. `findings/index.md`: one line per finding; open a subject file only for detail.
4. `baseline/external-state.md` (once it exists): console settings a human must verify.

Everything else exists for traceability.

## How a session resumes

1. Read this file, `progress.md`, and `findings/index.md`.
2. Check the branch (`audit/phase-0-methodology` for Phase 0; the canonical audit branch recorded in `progress.md` afterward) and whether `main` has moved since the recorded baseline. If it has, run the re-baseline procedure in `methodology.md` section 9 before doing anything else.
3. Continue from the "Next action" line in `progress.md`.
4. Commit after each completed unit of work. Update `progress.md` in the same commit.

## Rules in one paragraph

Read-only toward everything outside this directory. Evidence is cited with a grade (RUN, READ, CONSOLE, INFER, UNVERIFIED). Findings are keyed by root cause, live in exactly one subject file, and carry a stable ID that is never reused. Severity needs a named failure scenario and a timing. No secrets or credential-shaped strings anywhere in these files (`/CLAUDE.md` section 18). The audit never edits application code, schemas, workflows, configuration, or the boilerplate tooling, even to fix a defect it finds; defects become findings.

## Boilerplate note

This directory and `/docs/fable-audit-charter.md` are reference-app material and must not reach a generated application or the exported boilerplate. The export/init manifest (`scripts/boilerplate/manifest.mjs`) does not yet exclude them; see `decisions-needed.md` Q-002. Until that is changed by an approved slice, do not run `pnpm export:boilerplate` for publication.
