# Fable Analysis — Stage 2: Verification of "enforced" claims

Branch audited: `fable/clean-audit-base` · Date: 2026-10-08 · Builds on `stage-1-baseline.md`

**Method:** static verification only — grep, targeted line ranges, and the GitHub API via `gh`. No dependencies were installed and no project scripts were run in this environment (see §6 for why). Labels: **PROVED** (seen in a file, command output or API response), **INFERRED**, **REPORTED BY OWNER (not verified here)**, **UNVERIFIED (console)**.

---

## 1. Does the repository's own validation pass?

- **REPORTED BY OWNER, not verified here:** the owner's other session ran the full `pnpm validate` on `main` (lint, typecheck, unit tests, template/boilerplate tests, build) and it passed.
- **PROVED (GitHub API, `gh run list`):** the `CI / Validate` workflow succeeded on the two most recent pushes to `main` (merges of PR #107 and #109) and on three recent Dependabot PRs (grouped minor/patch bump of 13 packages, actions group, `@types/node` 20→26). It **failed** on three Dependabot major bumps: TypeScript 5.9→7.0, ESLint 9→10, Expo 57→58. *Consequence:* the gate works as designed — breaking upgrades are stopped at the PR. *When it matters:* now (these three major-version PRs need a human decision: close, or schedule an upgrade issue).

## 2. Branch protection — moved from UNVERIFIED to PROVED

**PROVED (GitHub API `rules/branches/main`, `rulesets/24677009`):** ruleset "Protect main", enforcement **active**, applies to the default branch, **no bypass actors**:

| Rule | Setting | Assessment |
|---|---|---|
| Deletion blocked | yes | Good |
| Force-push (non-fast-forward) blocked | yes | Good |
| Pull request required | yes, **0 approving reviews required** | Acceptable for a solo owner; it means the author can merge their own PR with no second reader. Document as a deliberate choice. |
| Required status check | `Validate` (GitHub Actions) | Matches `ci.yml` job name — good |
| "Require branch up to date before merge" (strict) | **off** | **Gap:** two PRs that each pass alone can merge in sequence and break `main`. The docs cover this with a *process* rule ("revalidate affected open PRs"); the setting would make it mechanical. *When it matters:* before parallel issues are worked. **Human step (GitHub → Settings → Rules → Protect main):** tick "Require branches to be up to date before merging". |
| Extra approval for unattributed changes | on | Fine |

## 3. The shadcn/ui "every control" rule — PROVED, with a precise picture

- `apps/web/components/ui/raw-controls.test.ts` scans every `.tsx` under `app/` and `components/` for `<button|input|select|textarea|label|table>`, skips `components/ui/` and `components/proof/`, and compares against a hard-coded allowance (`REMAINING_RAW_CONTROLS`, lines 10–20). A new raw control anywhere fails; converting one *also* fails until the number is lowered — a true one-way ratchet. **PROVED, well designed.**
- **Allowance today: 17 raw controls across 9 files** (import-wizard 5, submission-queue 3, event-editor 2, manage-actions 2, event-browser 1, mock-edit-form 1, org-browser 1, discover-filters 1, notification-preferences 1). My independent grep reproduced exactly these counts. Tracked under issue #91.
- **Exclusion found (PROVED):** `components/proof/proof-items-panel.tsx` contains a raw `<label>` and `<input>` (lines 74, 77) and is skipped by the test because that slice is deleted from generated apps. Reasonable, but it means the reference "proof" feature does not itself follow the UI rule.
- **Only 6 shadcn primitives exist** (avatar, badge, button, card, input, tabs). No select, checkbox, dialog, form, label, table, textarea, switch. *Consequence:* the 17 exceptions exist largely because the needed primitives were never added. *When it matters:* before building apps — add primitives first, then the allowance goes to zero naturally.

**Verdict on rule (4) "shadcn/ui for every UI control":** enforced and honest, but currently **not met** (17 known exceptions + 1 excluded file); the fix path is clear.

## 4. Other enforcement claims sampled

| ID | Claim | Result | Evidence |
|---|---|---|---|
| E1 | No secrets in committed files | **PROVED, real patterns** | `lib/security.test.ts` lines 114–117: regexes for Clerk `sk_live_/sk_test_` (excluding `REPLACE_ME`), `pk_live_`, and credentialed `postgres://user:pass@host` (excluding `USER:PASSWORD@HOST`); `.env.example` must match the placeholder form (line 107). |
| E5 | `cn` from `@/lib/utils` only | **PROVED contradiction** | No file imports from the `cn` npm package (grep: zero hits) yet `apps/web/package.json` declares `"cn": "^0.4.0"`. Dead dependency. *Fix:* remove it. *When:* now (trivial, but it undermines "rules match code"). |
| E11 | Every top-level route has a protection decision | **PROVED** | `proxy.ts` line 3: protected matcher = `/dashboard`, `/account`, `/admin`, `/proof`; `proxy.test.ts` reads `app/` with `readdirSync` so a new top-level folder fails the test until listed (deny-by-default for *new* routes). Note: protection is by *path prefix* only; it is authentication, not authorization. Authorization is in services (E12). |
| E10 | Env validated "at startup" | **PROVED lazy, not at startup** | `lib/env/server.ts` line 11: `cached ??= parseServerEnv(process.env)` — validation runs on *first use*, and `deployment.md` confirms production builds *without* env vars. *Consequence:* a misconfigured deployment goes green and fails on the first request. Partly deliberate (secret-free CI build). *When it matters:* before real users — add a post-deploy health check (`/api/v1/status` exists) or an instrumentation-time check. |
| E16 | Integration + E2E tests | **PROVED: exist, gated, not in CI** | `proof-items.integration.test.ts` lines 17–22 refuse unless `DATABASE_ENV` is dev/qa, `APP_ENV` matches, and not on Vercel. Playwright `global-setup.ts` line 8 and config line 55: specs **skip unless `E2E_READY=1`**. `docs/testing.md` line 77 states plainly: "Neither command is in `pnpm test`/`validate`, and neither runs in CI yet … a human workflow change." Honest, but the real-infra tests are effectively opt-in. **Human step:** create a `qa` Neon branch + Clerk test instance secrets in GitHub Actions, then a second CI job. |
| E19 | Security headers / CSP | **PROVED absent; self-reported** | `security.md` "Gaps": "Rate limiting, security headers/CSP, audit logging, and automated dependency scanning in CI are not configured." `next.config.ts` has no `headers()`. |
| E24 | Mobile Clerk | **PROVED absent; self-reported** | `mobile.md` "Remaining scaffolding work" item 1: "Add `@clerk/expo`, secure token storage…". No navigation chosen (item 2), no EAS project/store IDs (item 3). |
| E23 | Vercel / Neon / Clerk console state | **Partly REPORTED BY OWNER** | `deployment.md` §10 (dated 2026-10-08): ruleset, production-deploy-on-merge, preview protection and production variable *names* were read back by the owner; **still not verified:** Preview variable *values*, whether Preview uses `qa`, Neon branch settings, Clerk dashboard settings. |

## 5. Documentation correctness and consistency — defects found

| ID | Finding | Evidence | Consequence / when |
|---|---|---|---|
| D1 | **`testing.md` contradicts itself three times.** Line 11: "Playwright … is not installed yet"; line 75: `test:e2e` runs Playwright, and `@playwright/test` is a devDependency. Line 51: database integration "Future"; line 72: "implemented, Issue 49". Line 5: "component/E2E … cannot yet be exercised" vs line 75. | `docs/testing.md` lines 5, 11, 49–51, 72–77 | An agent reading the top of the file gets the wrong answer. *Now.* |
| D2 | **`architecture-rules.md` is structurally broken.** 23 headings are written as `**# Title**` (bold-wrapped, not Markdown headings); 704 of 1,100 lines are blank. Only §22–29 use real headings. | `grep -c '^\*\*#'` = 23; blank-line count | The top authority cannot be outlined or linked by section; the file is ~64% whitespace. *Now* (cheap fix). |
| D3 | **Authentication/authorization rules are written in 7 places.** `data-fetching.md` §8–9, `data-mutations.md` §7–8, `database.md` §9, `architecture-rules.md` §6, `auth.md` (whole doc), `api.md`, `security.md`. "Where business logic lives" is stated in 8 docs. | grep of section headings | Drift is near-certain over time; the agent pays to read all of them. *Soon.* Recommend: one owner doc per rule, others link. |
| D4 | Doc cross-links are all valid. | Every `/docs/*.md` path referenced from `CLAUDE.md` and `docs/` resolves to a file. | Good — no broken references. |
| D5 | `routing.md` and `server-components.md` are empty but listed as authorities (from Stage 1). | 0-byte files | Minor; CLAUDE.md's "empty = no rules" clause covers it, but each listing costs an agent a read. |

## 6. Environment limits of this audit (not defects in the repository)

- The npm registry is not reachable from this audit container (DNS resolution for `registry.npmjs.org` fails; `nodejs.org` is blocked by the egress policy). Therefore dependencies were not installed and no project script (`pnpm validate`, `lint`, `test`, `build`) was executed here. The pass/fail evidence in §1 comes from the owner's report and from GitHub's recorded CI runs.
- Node 22 is installed here; the repo requires Node ≥24. Irrelevant once scripts are not run, but noted.
- GitHub branch-protection *legacy* endpoint returned 403 for this token; the newer rulesets endpoints worked and are what §2 relies on.
- Vercel, Neon and Clerk consoles were not accessed.

## 7. Updated verdict after Stage 2 — confidence: **MEDIUM-HIGH (≈75%)**

The Stage 1 verdict stands and is now better evidenced: **a strong, honestly-documented web/API/DB foundation whose enforcement tests are real and well-built, but not yet a web+mobile boilerplate.**

What improved from Stage 1: branch protection is now **proved** (active, no bypass, `Validate` required). The shadcn rule is proved to be a genuine ratchet.

What got worse from Stage 1: the docs have concrete self-contradictions (D1) and a structurally broken top authority (D2); env validation is lazy by design (E10); the proof slice is exempt from the UI rule.

**Highest-risk gaps carried into Stage 3:**
1. Mobile is a shell: no Clerk, no navigation, builds never run — the "shared auth across three clients" promise is unproven.
2. Real-infrastructure tests (Neon, Clerk, browser) are opt-in and never run in CI.
3. No security headers/CSP, no rate limiting, no dependency vulnerability scanning in CI.
4. Doc contradictions and duplication (D1–D3) — cheap to fix, costly to leave.
5. Ruleset: "require branch up to date" is off; 0 reviewers.

**Human steps identified in this stage:** (a) GitHub ruleset → enable "require branches to be up to date"; (b) decide the three failing Dependabot major-bump PRs; (c) Vercel → confirm Preview env values and that Preview maps to `qa`; (d) Neon → branch/PITR settings; (e) Clerk → dev vs prod instance and key placement; (f) GitHub Actions secrets for a future integration/E2E job.

---

## Response to the owner (chat message, Stage 2)

Stage 2 is done and pushed to `fable/analysis-results` as `docs/fable-analysis/stage-2.md`.

**Bottom line:** the "enforced" claims from Stage 1 held up. The tests are real, well-built, and the branch ruleset on `main` is now **proved** active (PR required, `Validate` check required, no bypass, no force-push). Your own validation run on `main` is recorded as *reported by you, not verified here*; GitHub's CI history independently shows `Validate` passing on `main` and stopping three breaking Dependabot upgrades (TypeScript 7, ESLint 10, Expo 58) — which is exactly what it should do.

**New things found:**
- The shadcn rule is a one-way ratchet with **17 allowed raw controls in 9 files** (issue #91), plus the proof panel is exempt. Only 6 shadcn primitives exist; add the missing ones (select, checkbox, dialog, form, label, table…) and the exceptions can go to zero.
- `cn` npm package is dead weight in `apps/web/package.json` — nothing imports it.
- Env validation is lazy (first request), not at startup — a bad prod config deploys green.
- Integration/E2E tests skip unless `E2E_READY=1` / DB env is set, and never run in CI. Needs secrets + a second job (a human step).
- `testing.md` contradicts itself (says Playwright isn't installed, then runs it; says integration is "future", then "implemented").
- `architecture-rules.md` is 64% blank lines with fake bold headings — the top rule file can't be outlined.
- Ruleset gap: "require branch up to date before merge" is off, and 0 reviewers required.

**Could not do here:** install dependencies or run scripts (npm registry blocked in this container) — listed separately in §6 as an audit limitation, not a repo defect.

Confidence is now **~75%**. Type **continue** for Stage 3: depth on mobile readiness, the CI gap, and security headers, then the final verdict and the "must fix before building apps" list.
