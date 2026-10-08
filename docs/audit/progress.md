# Audit Progress

The single resumable state of the audit. Update in the same commit as the work it describes.

## Current state

| Item | Value |
| --- | --- |
| Baseline commit | `31ec6ba` (`main`, 2026-10-06) |
| Audit branch | `audit/phase-0-methodology`, the canonical audit branch; PR #82 under issue #81 (Q-001 answered). Never merge before convergence. |
| Current pass | Pass 2 (Subject examinations) in progress. Done: SEC, DEVOS, DATA, AUTH, REL, BOIL. |
| Depth budget | As `methodology.md` section 4 (Deep: AUTH, DATA, SEC, REL, DEVOS, BOIL; Standard: ARCH, TEST, OPS, REQ; Light: CODE, UX) |
| Next action | Pass 2 subject ARCH (then TEST, OPS, REQ; CODE, UX). ARCH must absorb the carry-forward on API versioning for stale mobile clients (F-REL-005), the not-found versus forbidden convention (F-AUTH-007), the one-token path across clients (F-AUTH-005), idempotency and concurrency (P-CH-09), and external-dependency failure handling. Before starting: compare `main` to `826b53e`. |
| DATA 2026-10-07 | Pass 2 subject DATA done: `findings/DATA.md`, 11 findings (5 Medium, 4 Low incl. 2 DEFER, 2 Info KEEP), all Draft; lens matrix complete; 10 prior-input rows mapped. Branch-name question answered: no code, script or test reads a Neon branch name; `prod` is only the logical `DATABASE_ENV` value, and `database.md:73` already documents the `production` mapping, so the earlier "doc drift" reading is corrected (F-DATA-011). Grade GREEN for the repo-evidence portion (all files read, none run); platform facts still UNVERIFIED: Neon role list, qa/stage/prod migration state, whether `production` holds real data, `pg_available_extensions`, Preview's `DATABASE_URL` role. |
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
| Step 1 GitHub 2026-10-07 | Step 1 GitHub settings read back with `gh api` (CONSOLE) and recorded in `baseline/external-state.md`: ruleset `Protect main` active, fork-PR approval `first_time_contributors` (U-22 answered), the rest unchanged. U-24 answered: all 7 red merges were red at the PR head, not merge skew. Issue bodies read (45 issues): no template, free-form structure, F-DEVOS-010 added. Q-002 applied (issue #83, PR #84); Q-006 answered (Vercel read access). Clerk has only a Development instance and Production runs test-mode keys (U-10 partly answered, deferred; no domain). Step 1 for GitHub is GREEN; Vercel, Neon and Clerk remain owner-relayed. |
| AUTH 2026-10-07 | Pass 2 subject AUTH done: `findings/AUTH.md`, 10 findings (4 Medium, 4 Low incl. 1 DEFER, 2 Info KEEP), all Draft; lens matrix complete; 12 prior-input rows mapped. Evidence: code read in full; read-only requests to Production (fail-closed API, handshake redirect for pages, Production runs a Clerk development instance). The Clerk dashboard and a request with a valid token were not examined. Q-009 and Q-010 were answered by Rich on 2026-10-08. Grade GREEN for the repo-evidence portion; Clerk settings UNVERIFIED (U-10 to U-12). |
| REL 2026-10-08 | Pass 2 subject REL done: `findings/REL.md`, 8 findings (1 Medium, 6 Low incl. 3 DEFER, 1 Info KEEP), all Draft; lens matrix complete; 10 prior-input rows mapped. New facts (CONSOLE, Vercel API, read-only): merge to `main` deploys Production automatically (U-01 answered); Production is public, Previews protected (U-21 answered); function region US East versus a US West database; Node 24 on Vercel versus Node 22 in CI; Production has no database or `APP_ENV` variables. Decision for Rich: Q-011 (app identity), default defer. U-02 (Preview values) still open. |
| BOIL 2026-10-08 | Pass 2 subject BOIL done: `findings/BOIL.md`, 6 findings (1 Medium, 4 Low, 1 Info KEEP), all Draft; lens matrix complete; 3 prior-input rows mapped. Key points: the template test is inside the required `Validate` check and caused the PR #82 red build (F-BOIL-001); the copy routines include the private local env file and the export includes untracked files (F-BOIL-002, RUN); `prove:init --full` cannot run on Windows (F-BOIL-003, RUN); the published template repo is public and stale (F-BOIL-004). The generated application's own build and tests were NOT run (owner asked to stop retrying; AMBER). Decision for Rich: Q-012 (default: freeze). |
| Open questions | Q-003, Q-004, Q-005, Q-007, Q-008, Q-011 (`decisions-needed.md`); Q-012 answered 2026-10-08; Q-009 and Q-010 answered 2026-10-08 (Q-009 keeps one owner residual-risk item: legal review); Q-001, Q-002 (applied), Q-006 answered |
| Open items from DEVOS | none blocking. U-24 and the Definition-of-Ready read are closed (2026-10-07). |
| Open contradictions | none (no findings yet). Pass 4 to settle: F-DATA-003 versus F-DEVOS-007 (migration gate timing). |

## Facts observed during Phase 0 (carry forward into Pass 1; not findings)

These were observed while evaluating the charter. They are recorded so that Pass 1 does not lose them and so that their influence on the method is traceable (`phase-0-critique.md` 3.7). Each must be re-recorded in the proper baseline file with its command before any finding cites it.

| # | Fact | Grade | How observed (2026-10-06) |
| --- | --- | --- | --- |
| 1 | `main` has no branch protection and the repository has no rulesets. **Superseded 2026-10-07:** ruleset `Protect main` now exists (external-state read-back). | CONSOLE | `gh api repos/<owner>/<repo>/branches/main/protection` returned 404 "Branch not protected"; `gh api .../rulesets` returned an empty list. |
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
| 16 | `apps/web/lib/security.test.ts` fails on Windows with three false failures (expected `db/index.ts`, received `db\index.ts`; the test-code exemption regex uses forward slashes so `packages/shared/src/testing/index.ts` is flagged for its fake connection string). Identical with and without the audit files, so the audit docs introduce no offender. CI runs on Linux where the test is believed to pass (INFER). **Fixed 2026-10-07** by PR #88 (issue #87): paths normalised to posix; web tests pass on Windows. | RUN | `corepack pnpm --filter web exec vitest run lib/security.test.ts`, with the audit directory present and stashed. |
| 17 | Repository is public; default `GITHUB_TOKEN` permission is write; all actions allowed; Dependabot alerts disabled; secret scanning on. Full detail in `baseline/external-state.md`. | CONSOLE | `gh api` (2026-10-06). |
| 18 | A fresh boilerplate export carries every Signal One Sound product mock, `docs/audit`, and the charter; the published export is 52 paths behind. | RUN | `pnpm export:boilerplate` to a temp dir, `diff -rq` against a clone of `fullstack-boilerplate`. |
| 19 | Three Windows-only failures block `pnpm validate` on the developer machine: path separators in two static tests, and CRLF in the export self-test. All pass in Linux CI at the baseline. **Partly fixed 2026-10-07:** the two path-separator tests by PR #88; the CRLF export self-test (`test:boilerplate` test 3) still fails on Windows (issue #87 stays open). | RUN | `pnpm validate`, `pnpm test:boilerplate` with and without the audit directory. |
| 20 | CI on the audit branch head (run `37534967908`) is red: `test:boilerplate` fails 3 of 6 because `docs/audit/` contains terms the init leak check refuses. Corrects the reading of facts 16 and 19 for the audit branch: the audit directory is not neutral on Linux. Earlier audit commits were not inspected. **Fixed 2026-10-07:** `docs/audit` added to `REFERENCE_ONLY_PATHS` (PR #84); CI on PR #82 is green after merging `main`. | RUN | CI job log via the CI tooling, 2026-10-06. |
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

### 2026-10-07, Pass 2, subject DATA

* `main` had not moved from `31ec6ba`; no re-baseline needed.
* Created `findings/DATA.md`: 11 findings (5 Medium, 4 Low including 2 DEFER, 2 Info KEEP); lens matrix complete. Reconciled `P-78-M05/M06/M12/M15`, `P-CH-08/28/30`, `P-GAP-04/06`, `P-SEC-07`; partial: `P-CH-09`, `P-CH-29`. Absorbed the SEC carry-forward (roles U-05, U-09, U-15 as F-DATA-005, Low confidence).
* Evidence gathered before re-reading the inputs: every file under `apps/web/db`, `scripts/db-*`, `drizzle/`, the Drizzle config, `lib/services/atomic.ts`, shared env guards; a repository-wide search of `prod` references; the Neon UI-RELAY and SQL records.
* Challenges to prior work: the 2026-10-07 reading of `prod` versus `production` as doc drift was **corrected** (F-DATA-011); the fact-pass statement that `db:check`/`db:migrate:verify` are "omitted from CI" was **narrowed** (they cannot run in CI without a Neon credential, F-DATA-003); P-78-M12 and P-GAP-06 (transactions) were **resolved** by `AtomicRunner`; F-DEVOS-007 (defer migration gates) is partly **contradicted** for the drift and from-zero check (Pass 4 to settle).
* Metrics: findings 31 (all Draft: 2 High, 13 Medium, 9 Low, 7 Info); questions unchanged. No Critical or High DATA finding: there is no real data (U-07 unverified).
* Not done: nothing was run (no `pnpm`, no credentials); roles, per-branch migration state and extension availability need operator reads (listed in `DATA.md` carry-forward). Any spend (plan upgrade) is not requested. No change outside `docs/audit/`.

### 2026-10-07, Pass 2 follow-ups (GitHub access)

* `main` had moved from `31ec6ba` to `826b53e` by six commits, all outside the audit: PR #84 (manifest fix, Q-002), PR #86 (ruleset documented in `docs/security.md`), PR #88 (Windows test paths). No product code changed.
* Read with `gh`: repository settings and ruleset; fork-PR approval; `Validate` on every merged PR's head and merge commit (U-24); all 45 issue bodies. Wrote: `external-state.md` read-back and U-22, U-24, U-10 notes; `F-DEVOS-010` (new); History lines on `F-DEVOS-002`, `F-SEC-001`, `F-SEC-003`; Q-002 and Q-006 statuses; this file.
* Challenge to prior work: the "two mechanisms" reading of the seven red merges in `F-DEVOS-002` is **corrected** (all seven red at the PR head).
* Metrics: findings 32 (all Draft: 2 High, 13 Medium, 10 Low, 7 Info); questions: Q-003, Q-004, Q-005, Q-007, Q-008 open; U-22, U-24 answered, U-10 partly.
* Not done: AUTH and the later subjects; Neon and Clerk reads stay owner-relayed. No change outside `docs/audit/`.

### 2026-10-07, Pass 2, subject AUTH

* `main` was `826b53e` (six commits since the recorded baseline, none touching an AUTH file); no AUTH evidence re-baselined.
* Created `findings/AUTH.md`: 10 findings (4 Medium, 4 Low including one DEFER, 2 Info KEEP); lens matrix complete. Reconciled `P-78-M10/M13/M14/T01/T11/O05`, `P-CH-05/06/07/33`, `P-GAP-01`, `P-RM-01`, `P-NOTES-01`, `P-SEC-06` (audit part). Added Q-009 and Q-010.
* Evidence gathered before re-reading the inputs: the whole auth, proxy, API adapter, service context and layout code; `docs/auth.md` against the code; the product plan and roadmap for user-data and role statements; read-only HTTP probes of Production (RUN).
* Challenges to prior work: the ledger's C-08 understated (layouts return a blank page); no prior finding rejected. A first reading that protected pages return 404 was **withdrawn** after a browser-style request showed the normal Clerk handshake redirect (a curl artefact).
* Metrics: findings 42 (all Draft: 2 High, 17 Medium, 14 Low, 9 Info); questions open: Q-003, Q-004, Q-005, Q-007, Q-008, Q-009, Q-010. No contradictions among findings.
* Not done: Clerk dashboard settings, a valid-token request, mobile Clerk integration, the Playwright spec run. No change outside `docs/audit/`.

### 2026-10-08, owner decisions on Q-009 and Q-010

* Rich answered Q-009 (age 18 or over; US first, plan for worldwide; terms and privacy acceptance at sign-up; legal review undecided) and Q-010 (two admins; church managers request and an admin approves; members need no approval; payment expected, tentative). Recorded with the engineering decisions that follow in `decisions-needed.md`, and referenced from F-AUTH-001, F-AUTH-003 and the AUTH carry-forward.
* The second admin's name is intentionally not recorded (public repository).
* No finding changed severity. F-AUTH-003's collection gate is now concrete: privacy policy page, terms acceptance, and 18+ confirmation, with legal review a hard gate only before the first non-US user.

### 2026-10-08, Pass 2, subject REL

* `main` was `826b53e`; none of the six commits since the baseline touches the deployment path. No REL evidence re-baselined.
* Created `findings/REL.md`: 8 findings (1 Medium, 6 Low including three DEFER, 1 Info KEEP); lens matrix complete. Reconciled `P-78-M09/T02/T03/T04/O07`, `P-CH-18/22/23`, `P-GAP-02/03`, plus `C-22/23/24`. Added Q-011; answered U-01 and U-21; added a note to Q-009 (owner's generic policy now, attorney later).
* Evidence gathered before re-reading the inputs: `ci.yml`, `deployment.md` and `environment.md` in full, the Next and mobile configuration, and read-only Vercel API reads (project, latest Production deployment, recent deployments, variable names and targets).
* Challenges to prior work: F-SEC-001's evidence updated (deploy-on-merge is true); the Stage reading in `deployment.md` challenged (the missing control is a promotion step, not a Stage project); P-CH-22 re-opened narrowly for the Node and pnpm mismatch.
* Metrics: findings 50 (all Draft: 2 High, 18 Medium, 20 Low, 10 Info); open questions: Q-003, Q-004, Q-005, Q-007, Q-008, Q-011. No contradictions among findings.
* Not done: Preview variable values (U-02), Vercel plan tier, build and function logs, EAS (no project). No change outside `docs/audit/`.

### 2026-10-08, Pass 2, subject BOIL

* `main` was `826b53e`; the only boilerplate-path change since the baseline is PR #84. No BOIL evidence re-baselined.
* Created `findings/BOIL.md`: 6 findings (1 Medium, 4 Low including one REMOVE, 1 Info KEEP); lens matrix complete. Reconciled `P-78-O04`, `P-GAP-08`, `P-GAP-09`; added Q-012.
* Runs (scratch folders, all deleted): export and its leak check; clone of the published template for comparison; `prove:init` without `--full` from a verified clean clone (passed); `prove:init --full` (failed to start on Windows: F-BOIL-003). One temporary copy of the private local environment file was created by the tooling during a failed run (a clone step that silently fell back to the real repository, then the tool's missing cleanup) and was deleted; no credential left the machine.
* Not done: the generated application's install, lint, typecheck, test and build (owner asked to stop retrying; to be done on a Linux runner or when the owner is at the PC).
* Metrics: findings 56 (all Draft: 2 High, 19 Medium, 24 Low, 11 Info); open questions: Q-003, Q-004, Q-005, Q-007, Q-008, Q-011, Q-012.

### 2026-10-08, owner decisions after BOIL

* Q-012 answered (a second application will be built; this one first). Recorded with the engineering decisions in `decisions-needed.md` and in F-BOIL-001, F-BOIL-004.
* The owner approved removing the misleading boilerplate reports: issue #89, PR #90 (outside `docs/audit/`, on its own branch; merged by the owner, never by Claude).
* The owner reported a shared Vercel login for the business partner: recorded as F-SEC-007 History and a UNVERIFIED note (U-16, U-17). No name is recorded in this public repository.
