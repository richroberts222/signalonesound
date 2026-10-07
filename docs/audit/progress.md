# Audit Progress

The single resumable state of the audit. Update in the same commit as the work it describes.

## Current state

| Item | Value |
| --- | --- |
| Baseline commit | `31ec6ba` (`main`, 2026-10-06) |
| Audit branch | `audit/phase-0-methodology`, the canonical audit branch; PR #82 under issue #81 (Q-001 answered). Never merge before convergence. |
| Current pass | Pass 2 (Subject examinations) in progress. Done: SEC, DEVOS. |
| Depth budget | As `methodology.md` section 4 (Deep: AUTH, DATA, SEC, REL, DEVOS, BOIL; Standard: ARCH, TEST, OPS, REQ; Light: CODE, UX) |
| Next action | Pass 2 subject DATA (then AUTH, REL, BOIL; ARCH, TEST, OPS, REQ; CODE, UX). DATA must absorb the SEC carry-forward (least-privilege roles U-05, U-09; `NEON_DEV_DATABASE_URL` scope U-15) and the P-78-M05, M06, M12, M15, P-CH-08, P-CH-28, P-CH-30, P-GAP-04, P-GAP-06, P-SEC-07 rows. Before starting: compare `main` to `31ec6ba`; note that CI on this PR is red until Q-002 is applied (not caused by DATA work). |
| Fact pass 2026-10-07 | Reconciliation-checkpoint prerequisite 1 recorded in `baseline/repo-fact-pass-2026-10-07.md`. AMBER: repository state read; GitHub settings and vendor docs not verified. Does not change the next audit action. |
| Reconciliation plan 2026-10-07 | Step 0 (freeze model-on-model reconciliation rounds) approved by Rich and GREEN. Evidence now drives the process; one independent adversarial audit is reserved for Step 7 (audit of rewritten rules). Step 1 (GitHub, Vercel, Neon and Clerk settings read-back) is being gathered by the operator and returns to Claude for adjudication; then Step 2 (Q-002, Q-008, U-24, U-25 owner decisions), Step 3 (primary vendor sources), Step 4 (remaining audit passes). Canonical rule rewrite (Step 6 onward) stays gated and needs its own approved issue and PR. |
| Decision model 2026-10-07 | Rich is product owner, not engineering reviewer. Claude decides engineering matters (architecture, CI/CD, database, testing, security controls, rule text, enforcement, evidence sufficiency, GREEN/AMBER/RED, Q-002 approach, Q-008 approach, issue and PR scoping). The operator executes GitHub, Vercel, Neon and Clerk actions and returns evidence. Rich decides only product, business, privacy/age policy, legal or residual-risk acceptance, spending, credentials or account actions, and irreversible actions. Supersedes the "Owner decision: yes" marks on plan Steps 2, 4, 6, 7, 8 and 9 except where listed in the PR comment of this date. Claude never merges. |
| Step 1 status 2026-10-07 | Operator reports its connector exposes no ruleset, branch-protection, Actions-permissions, Dependabot or secret-scanning endpoints. Step 1 settings are ACCESS-BLOCKED, not inferred; the external-state rows from 2026-10-06 remain the only evidence and stay marked unverified. Not waiting on Rich. A human with `gh` or dashboard access can close it later; the plan continues without it. Q-002 decided (option 1, draft issue text in `decisions-needed.md`). U-25 remains a question for Rich and blocks nothing. |
| Step 1 Vercel 2026-10-07 | Operator relayed Vercel dashboard evidence from owner screenshots (names and scopes, values masked). Graded UI-RELAY and recorded in `baseline/external-state.md`. Partly answers U-02, U-03, U-20; Production has no database variables. Six remaining Vercel facts listed there. Neon still pending from Rich. GitHub settings remain access-blocked. Step 1 is AMBER. DATA is the next technically eligible subject and was not started in this session. |
| Step 1 Vercel protection 2026-10-07 | Operator relayed Deployment Protection settings from owner screenshots (UI-RELAY, no change made). Recorded in `baseline/external-state.md`. Findings: Vercel Authentication on, no bypass secret, no exceptions, sourcemaps protected; open points are Production exposure (U-21), Trusted Sources letting development tokens reach Preview, Shareable Link existence, and plan tier. Two new facts requested (7, 8). Step 1 stays AMBER. |
| Step 1 Vercel domains correction 2026-10-07 | Owner screenshot of Settings > Environments > Production shows exactly one domain, `signalonesound.vercel.app`. The earlier reading of "+2" as two extra domains is withdrawn. U-20 answered: no custom production domain evidenced (UI-RELAY). Implication (INFER): Clerk has no real production domain yet, so REL launch readiness is unmet. U-21 still open. Step 1 stays AMBER. |
| Step 1 Vercel last deployment 2026-10-07 | Owner screenshot relay (UI-RELAY, no action taken): latest Production deployment is PR #80 on `main` at `31ec6ba`, Ready, about 11h old; audit-branch deployments are Previews. Matches the recorded baseline. U-01 partly answered (commit yes, automatic trigger not proven). Fact 5 of the Vercel list is closed except the trigger. Step 1 stays AMBER. |
| Step 1 Vercel team 2026-10-07 | Owner screenshot relay (UI-RELAY, no change made): one team member (Rich, Owner), 2FA indicator shows off, member invites are Pro-gated. Recorded in `baseline/external-state.md`. Reads as a single-owner single point of failure and a credential-lifecycle gap (F-SEC-007 carry-forward to SEC/OPS). Fact 6 mostly answered. Step 1 stays AMBER. |
| Step 1 Neon 2026-10-07 | Owner screenshot relay (UI-RELAY, no change made): project `SignalOneSound`, `production` is the Default branch, branch protection "Not protected", expiration "Never expires"; identifiers withheld. Recorded in `baseline/external-state.md`. Partly answers U-04 (root branch is named `production`, docs say `prod`). Carry-forward to DATA/OPS: unprotected root data branch. Region, other branches, plan, restore window, roles still needed. Step 1 stays AMBER. |
| Step 1 Neon restore 2026-10-07 | Owner screenshot relay (UI-RELAY, no change made): `production` Backup & Restore shows a 6 hour history window; no snapshots, no schedule (schedules offered as upgrade). Recorded in `baseline/external-state.md`. Partly answers U-08 (window known; plan tier and any exercised restore still unknown). Carry-forward to DATA/OPS: narrow recovery margin. Step 1 stays AMBER. |
| Step 1 Neon overview 2026-10-07 | Owner screenshot relay (UI-RELAY, no change made): Neon Free plan, region AWS US West 2 (Oregon), 4 branches (names not shown), default `production`, IP restrictions none, compute 0.25 to 2 CU, history 6 hours, PostgreSQL 18. Recorded in `baseline/external-state.md`. Answers plan tier and region (U-08 partly). Carry-forward to DATA/OPS/REL: Free-plan recovery limits, role separation as the access boundary, function-to-database region unknown. Step 1 stays AMBER. |
| Step 1 Neon extensions 2026-10-07 | Owner-run read-only SQL on `production`: `postgis` and `pg_trgm` are not installed (empty result, no mutation). Recorded in `baseline/external-state.md`. This is "installed", not "available"; availability stays UNVERIFIED and the spatial approach stays OPEN for DATA. Next read-only fact: `pg_available_extensions`. Step 1 stays AMBER. |
| Step 1 Neon branches 2026-10-07 | Owner screenshot relay (UI-RELAY, no change made): exactly 4 Neon branches, `production` (Default, no parent), `dev`, `qa`, `stage` (each child of `production`). Recorded in `baseline/external-state.md`. Answers U-04 for existence and topology; `prod` in docs is drift to `production`. Does not prove Vercel variables or roles map to branches (U-02, U-05, U-15 open). Step 1 stays AMBER. |
| Step 2 2026-10-07 | U-25 answered by Rich (recollection): no separate Claude code-review process existed. Q-008 decided by Claude: remove the silent review workflow (option 2); the follow-up issue and PR is human-applied and separate from Q-002. Q-002 and Q-008 are decided but not applied; PR #82 stays red until Q-002 lands. U-24 still needs `gh`. Step 2 is AMBER. Next: DATA. |
| Open questions | Q-002 to Q-008 (`decisions-needed.md`); Q-001 answered |
| Open items from DEVOS | Read the bodies of the 41 GitHub issues for the Definition-of-Ready half of P-CH-03 (needs `gh` or web access, not available in the DEVOS session); U-24 and U-25. A session with `gh` can close the first and refine F-DEVOS-002. |
| Open contradictions | none (no findings yet) |

## Facts observed during Phase 0 (carry forward into Pass 1; not findings)

These were observed while evaluating the charter. They are recorded so that Pass 1 does not lose them and so that their influence on the method is traceable (`phase-0-critique.md` 3.7). Each must be re-recorded in the proper baseline file with its command before any finding cites it.

| # | Fact | Grade | How observed (2026-10-06) |
| --- | --- | --- | --- |
| 1 | `main` has no branch protection and the repository has no rulesets. | CONSOLE | `gh api repos/<owner>/<repo>/branches/main/protection` returned 404 "Branch not protected"; `gh api .../rulesets` returned an empty list. |
| 2 | Secret scanning and push protection are enabled; Dependabot security updates are disabled; delete-branch-on-merge and auto-merge are off. | CONSOLE | `gh api repos/<owner>/<repo>` security_and_analysis fields. |
| 3 | 38 merged pull requests, none with a submitted review. | CONSOLE | `gh pr list --state merged --limit 100 --json reviews` (0 of 38 have reviews). |
| 4 | Remote branches per issue: issue 19 has five, issues 11, 60, 61 and 64 have two each. | CONSOLE | `git branch -r` grouped by `claude/issue-<n>`. |
| 5 | The published boilerplate `richroberts222/fullstack-boilerplate` has one commit dated 2026-10-01 and is not marked as a template repository. The reference foundation has changed since (UI docs, product docs, app shell, code-quality docs). | CONSOLE | `gh api repos/<owner>/fullstack-boilerplate` and its commits. |
| 6 | `scripts/boilerplate/manifest.mjs` excludes neither `docs/fable-audit-charter.md` nor `docs/audit/` from export or init. | READ | `REFERENCE_ONLY_PATHS`, `EXPORT_EXCLUDED_PATHS`, `TEMPLATE_ONLY_PATHS`. |
| 7 | `.github/workflows/claude.yml` allow-list contains no `git merge` or `git merge-base`, while `docs/issues.md` ("Workflow configuration constraints" and "Incorporating main") states the allow-list must include both and that the documented merge-from-main procedure needs them. | READ | `claude.yml` `claude_args`; `docs/issues.md` lines 55 and 96. |
| 8 | `claude.yml` grants `contents: write`, `pull-requests: write`, `issues: write`, `id-token: write`; sets `DATABASE_URL` from a dev secret at job level; allows `Bash(pnpm *)` and `Bash(npx *)`; uses floating `@v1` and `@v4` action tags. Already recorded in `docs/security.md`. | READ | `claude.yml`. |
| 9 | `apps/web/package.json` declares `cn@^0.4.0` alongside `clsx` and `tailwind-merge`. Whether anything imports it was not checked. | READ | `apps/web/package.json` line 32. |
| 10 | `docs/architecture-rules.md` (1,100 lines) has only eight top-level `#` headings, all in sections 22 to 29 at the end; sections 1 to 21 use a different heading style. | READ | `grep -c "^#"`. |
| 11 | `docs/routing.md` and `docs/server-components.md` are empty (by the repository's rule, this means no rules exist, not that rules are implied). | READ | `wc -l`. |
| 12 | `docs/deployment.md` section 7 says the validation workflow is "Planned, not built"; `.github/workflows/ci.yml` exists and runs `pnpm validate`. `docs/boilerplate.md` "Known gaps" already acknowledges this. | READ | Both files. |
| 13 | `apps/web/lib/security.test.ts` scans `.md` files for public-variable name patterns and exempts docs from that assertion; it is the repository's only Markdown-aware secret tripwire. | READ | Lines 27 to 45. |
| 14 | `apps/web/.env.local` exists locally and is gitignored. Not opened. | RUN | `git check-ignore -v`. |
| 15 | No validation command (`pnpm validate`, `pnpm audit`, boilerplate checks) was run in Phase 0. | RUN (not run) | Deferred to Pass 1. |
| 16 | `apps/web/lib/security.test.ts` fails on Windows with three false failures (expected `db/index.ts`, received `db\index.ts`; the test-code exemption regex uses forward slashes so `packages/shared/src/testing/index.ts` is flagged for its fake connection string). Identical with and without the audit files, so the audit docs introduce no offender. CI runs on Linux where the test is believed to pass (INFER). | RUN | `corepack pnpm --filter web exec vitest run lib/security.test.ts`, with the audit directory present and stashed. |
| 17 | Repository is public; default `GITHUB_TOKEN` permission is write; all actions allowed; Dependabot alerts disabled; secret scanning on. Full detail in `baseline/external-state.md`. | CONSOLE | `gh api` (2026-10-06). |
| 18 | A fresh boilerplate export carries every Signal One Sound product mock, `docs/audit`, and the charter; the published export is 52 paths behind. | RUN | `pnpm export:boilerplate` to a temp dir, `diff -rq` against a clone of `fullstack-boilerplate`. |
| 19 | Three Windows-only failures block `pnpm validate` on the developer machine: path separators in two static tests, and CRLF in the export self-test. All pass in Linux CI at the baseline. | RUN | `pnpm validate`, `pnpm test:boilerplate` with and without the audit directory. |
| 20 | CI on the audit branch head (run `37534967908`) is red: `test:boilerplate` fails 3 of 6 because `docs/audit/` contains terms the init leak check refuses. Corrects the reading of facts 16 and 19 for the audit branch: the audit directory is not neutral on Linux. Earlier audit commits were not inspected. | RUN | CI job log via the CI tooling, 2026-10-06. |
| 21 | Claude Code Review on the same head: job green, 3 turns, 4.5 s, about $0.07, 0 permission denials, "No buffered inline comments", on a 1,818-line docs-only diff. | RUN | Job log of run `37534967919`. |
| 22 | In a Claude Actions job `pnpm` is not on `PATH`, no `node_modules` exists, and `claude.yml` has no setup or install step; `corepack` and Node 22 are present. | RUN | `which pnpm node npx corepack` in the job. |
| 23 | No `.claude/` directory, issue or PR template, `CODEOWNERS`, `SECURITY.md`, `CONTRIBUTING.md`, or `LICENSE` exists in a public repository. | READ | Glob. |

## Pass log

Each entry: date, pass, what was done, metrics, IDs touched. This is the change log.

### 2026-10-06, Phase 0 (methodology)

* Read: charter; `/CLAUDE.md`; `docs/issues.md`, `product-development.md`, `code-quality.md`, `code-quality-audit.md`, `notes.md`, `boilerplate.md`, `boilerplate-gap-report.md`, `git-workflow.md`, `security.md`, `testing.md`, `automation/test-value-review.md`, `stack.md`, `deployment.md`, `customization-map.md`, `product/product-plan.md`, `product/roadmap.md`, `features/README.md`, `ideas/README.md`; the three workflows; `scripts/boilerplate/manifest.mjs`; parts of `export-template.mjs` and `security.test.ts`; root and web `package.json`; issues #78 and #79; PR #80; GitHub repository settings via API.
* Created: `README.md`, `methodology.md`, `phase-0-critique.md`, `progress.md`, `decisions-needed.md` (Q-001 to Q-006), `inputs-reconciliation.md` (P inventory, unmapped), `findings/index.md` (empty register).
* Not created on purpose: subject files, `baseline/`, `scenarios/`, `exception-requests.md`, `roadmap.md`.
* Metrics: findings 0; questions 6; prior inputs inventoried (see `inputs-reconciliation.md`), mapped 0.
* Validation of the audit files: ran the repository's static security test (`lib/security.test.ts`): 10 passed, 3 failed; the 3 failures are pre-existing Windows path-separator false failures (fact 16) and none names a file under `docs/audit/`. A grep of `docs/audit/` for credential-shaped URLs, key-shaped tokens, and secret-like public variable names found nothing.

### 2026-10-06, Pass 1 (baseline)

* Created `baseline/inventory.md`, `baseline/claims-ledger.md` (68 claims: 31 Proven or Proven-at-one-level, 13 Partial, 7 Prose, 12 Contradicted, 5 Unverified), `baseline/external-state.md` (GitHub CONSOLE facts, Vercel metadata from bot comments, Neon dev state; UNVERIFIED register U-01 to U-20), `baseline/history.md`.
* Commands run at the baseline: `pnpm install --frozen-lockfile`, `lint`, `typecheck`, `test:run`, `test:boilerplate`, `build`, `audit` (and `--prod`), `check:boilerplate`, `export:boilerplate` (temp dir), `db:check`, `db:migrate:status`, `db:migrate:verify` (dev, read-only); `gh api` reads of repository settings, secrets names, environments, collaborators, scanning status, PR/issue/run history, check runs on every merge commit. No database writes, no deployments, no `gh` mutations, no dependency changes.
* Not run: `test:integration`, `test:e2e`, `prove:init --full`, mobile export (Q-003, not provisioned).
* Notable facts beyond Phase 0: public repository; repo default token permission write; `Bash(gh pr *)` allow-list permits `gh pr merge` while the static test only matches the literal string; 7 PRs merged with a failing merge-commit check; Claude Code Review leaves no visible comments; `pnpm audit --prod` has 4 high advisories (all transitive via `shadcn`/`expo` declared as runtime deps); `cn` package declared and unused; 12 doc drifts recorded in the ledger (C-08, C-14, C-22, C-25, C-29, C-46, C-49, C-50, C-52 and others); export drift (fact 18); Windows gate failures (fact 19).
* Metrics: findings 0 (Pass 1 creates none); questions still 6; prior inputs mapped 0 (mapping happens per subject in Pass 2).
* Exit criteria check: every subject has an inventory section (yes); every claim has a status (68/68); every external dependency listed (GitHub, Vercel, Neon, Clerk, Expo/EAS/stores, Anthropic App). Pass 1 complete.

### 2026-10-06, Pass 2, subject SEC

* Created `findings/SEC.md`: 8 actionable findings (2 High, 5 Medium, 1 Low) and 3 KEEP records. Reconciled 22 prior-input rows (`P-78-C/D/E/K/M01/M02/M03/M04/M08/T06`, `P-CH-05/17/19/22/26/27/29`, `P-SEC-01` to `P-SEC-06`). Added Q-007 and U-21 to U-23.
* Evidence gathered before re-reading the inputs: workflow files, API handler, headers, tests, history secret scans (all refs), dependency inspection, read-only HTTP requests to the Preview, vendor reporting on the Claude Code action (INFER).
* New facts: Previews are behind Vercel Authentication (so app headers are unobservable, U-21); git history on all refs contains no credentials; `cn` is published by the shadcn-ui org (not a typosquat); `shadcn` is a genuine build dependency (it provides `tailwind.css`) but brings a 33-dependency CLI tree into the production install; the `gh pr *` allow-list wildcard permits `gh pr merge`.
* Challenges to prior work (Fable's Phase 0 and Pass 1, issue 78):
  * Phase 0 fact 9 and P-78-E ("`cn` possibly a typosquat"): **rejected** on registry and install evidence.
  * C-12 in the claims ledger understated the problem: the static test regex misses the wildcard, and any executed code bypasses the allow-list entirely (F-SEC-002 is stronger than "narrow the allow-list").
  * Issue 78 M01 (required review) **modified**: zero required approvals for a single-owner repository (F-SEC-001).
  * Issue 78 M03 **modified**: a blocking `pnpm audit` would fail CI now on advisories with no patch; non-blocking and runtime-path based (F-SEC-004).
  * Issue 78 M04 **modified**: headers now, CSP with the real UI (F-SEC-005).
  * Issue 78 D ("trigger does not check commenter permission") **rejected** as stated: the action gates on write permission by default (INFER); the residual risk is vendor vulnerability history.
  * Fable's severity framing kept: High, not Critical, for F-SEC-001, because deploy-on-merge is UNVERIFIED (U-01).
* Metrics: findings 11 (Draft); questions 7; prior inputs mapped 22 of ~110. No contradictions among findings yet.
* Not done: AUTH, DATA, TEST items listed in the SEC carry-forward are not findings yet. No workflow, setting, or code was changed.

### 2026-10-06, Pass 2, subject DEVOS

* `main` had not moved from `31ec6ba`; no re-baseline needed.
* Created `findings/DEVOS.md`: 9 findings (3 Medium, 4 Low including one DEFER, 2 Info KEEP); lens matrix complete. Reconciled 14 prior-input rows (11 fully: `P-78-A/B/O01/O03/O08`, `P-CH-02/04/20/25`, `P-GAP-05`, and the DEVOS part of `P-78-O05`; partial: `P-78-K`, `P-CH-01`, `P-CH-03`, `P-NOTES-01` pointer). Added Q-008, U-24, U-25; updated Q-002 (now blocks a green check on PR #82) and marked Q-001 answered.
* Evidence gathered before re-reading the inputs: docs and workflows read; doc reference and staleness greps; first-parent diff sizes; repository for templates, `CODEOWNERS`, `.claude/`, `LICENSE`; CI job logs of the audit branch head (validation and review); toolchain probe in the agent job.
* Challenges to prior work:
  * Phase 0 and Pass 1 reading that the audit directory is neutral and gate failures are Windows-only: **corrected** (fact 20). The audit branch is red on Linux; Q-002 modified.
  * P-78-A **modified**, P-78-B **modified** (remedy rejected), P-78-O03 **rejected** (parallel batches are real).
  * SEC carry-forward "seven PRs merged on a failing check" **narrowed**: the data show the merge commit red; some may be merge skew (4 of 8 CI-era PRs in parallel batches were red, against 3 of 19 others; small n, INFER); U-24 verifies.
  * SEC carry-forward "review control may not exist" **confirmed** with log evidence (fact 21); silence is indistinguishable from "found nothing".
  * F-SEC-002 point 5 is **superseded** by F-DEVOS-004 (grant `git merge` and `git merge-base` with exact patterns); `SEC.md` was not edited, so Pass 4 must apply this when challenging F-SEC-002.
  * No DEVOS finding is High; the high-severity process failures remain F-SEC-001 and F-SEC-002.
* Metrics: findings 20 (all Draft: 2 High, 8 Medium, 5 Low, 5 Info); questions 8 (Q-001 answered, 7 open); prior inputs fully mapped about 33 of ~110 (plus 4 partial). No contradictions among findings.
* Not done: the 68-row claims ledger was not extended with the new drift items (listed in F-DEVOS-003); issue-body reading (Definition of Ready); any change outside `docs/audit/`. No workflow, setting, or code was changed. `pnpm validate` was not run (read-only unit; no install in this job).
