# Audit Progress

The single resumable state of the audit. Update in the same commit as the work it describes.

## Current state

| Item | Value |
| --- | --- |
| Baseline commit | `31ec6ba` (`main`, 2026-10-06) |
| Audit branch | `audit/phase-0-methodology` (Phase 0). The canonical audit branch and PR are decided by Q-001. |
| Current pass | Pass 1 (Baseline) complete. Pass 2 (Subject examinations) not started. |
| Depth budget | As `methodology.md` section 4 (Deep: AUTH, DATA, SEC, REL, DEVOS, BOIL; Standard: ARCH, TEST, OPS, REQ; Light: CODE, UX) |
| Next action | Pass 2, Deep subjects in this order: SEC, DEVOS, DATA, AUTH, REL, BOIL; then ARCH, TEST, OPS, REQ; then CODE, UX. Start SEC: read `claude.yml` in full with the action's documented permission model, `lib/security.test.ts`, `handler.ts`, `proxy.ts`, `next.config.ts`; apply all nine lenses; create `findings/SEC.md`. Q-001 (push/PR) still open; work continues locally. |
| Open questions | Q-001 to Q-006 (`decisions-needed.md`) |
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
