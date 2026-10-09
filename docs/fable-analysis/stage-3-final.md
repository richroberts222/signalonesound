# Fable Analysis — Stage 3: Highest-risk gaps and final verdict

Branch audited: `fable/clean-audit-base` · Date: 2026-10-08 · Builds on `stage-1-baseline.md` and `stage-2.md` (nothing from those stages is re-verified here).

Labels: **PROVED** (seen in a file / API result), **INFERRED** (reasoned, not verified), **Human step** (needs a console).

---

## 1. Mobile readiness — what is missing, and the smallest proof

**What exists (PROVED):**
- `apps/mobile/src/App.tsx` renders one screen (`ProofItemsScreen`) with no navigation ("No domain screens or navigation yet", line 10).
- `src/proof/proofClient.ts` wraps the **shared** `createApiClient` from `@signalone/validation` with an absolute base URL and a `TokenProvider`; today it uses `noToken` (line 17), so every call is anonymous and the API correctly answers 401.
- `src/config/env.ts` already validates `EXPO_PUBLIC_API_BASE_URL`, `EXPO_PUBLIC_APP_ENV`, `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`; `.env.example` reserves the Clerk key.
- `eas.json` defines dev/qa/staging/production profiles with the right `EXPO_PUBLIC_APP_ENV` each; `app.config.ts` uses placeholder identifiers (`com.example.signalone`), which the init tool rejects (`init-app.mjs` line 48).
- `packages/validation/src/api-client.ts` line 11 documents the intended split: "Web: session cookie; Mobile: `getToken` → bearer token". The design is right; only the mobile half is unbuilt.

**What is missing (PROVED absent):**

| Piece | Status | Evidence |
|---|---|---|
| Clerk on mobile (`@clerk/clerk-expo`) + secure token cache (`expo-secure-store`) | Not installed | `apps/mobile/package.json` deps; `docs/mobile.md` "Remaining scaffolding work" item 1 |
| Token flow into the API client | Stubbed (`noToken`) | `proofClient.ts` lines 13–17 |
| Server accepting a bearer token | **INFERRED OK** — `lib/auth/server.ts` line 13 uses Clerk's `auth()`, which reads `Authorization: Bearer <session JWT>` as well as cookies. Must be proved by one real mobile call. | `lib/auth/server.ts` |
| Navigation | None chosen | `mobile.md` item 2 |
| Store identifiers / EAS project | Placeholders, no EAS project id | `app.config.ts` lines 17, 21; `mobile.md` item 3 |
| Any build ever run | No | `mobile.md` "Builds (prepared, not exercised)" |
| Mobile component/E2E tests | None (3 unit files only) | file list |

**Smallest walking skeleton (recommended, effort: medium):**
1. Add `@clerk/clerk-expo` + `expo-secure-store`; wrap `App` in `ClerkProvider` with the token cache; add a sign-in screen using Clerk's Expo hooks.
2. Pass `useAuth().getToken` into `createMobileProofClient` — a two-line change at `proofClient.ts` line 27.
3. Add `expo-router` (Expo's default) with two routes: sign-in and proof-items.
4. Run **one** EAS *development* build on one physical Android or iPhone device, sign in, create and delete a proof item, and confirm the row appears in the dev Neon database. (**Human step:** Expo account + EAS project id; Apple/Google developer accounts are *not* needed for a dev build.)
5. Record the result in `docs/mobile.md` and remove the "not exercised" wording.

That one journey proves the whole platform claim — shared contract, shared validation, Clerk on both clients, one API, one database. Until it runs, "web + mobile boilerplate" is a design, not a fact.

---

## 2. The CI gap — smallest safe design for integration + E2E in CI

**What exists (PROVED):** the tests already refuse unsafe targets — `proof-items.integration.test.ts` lines 17–22 refuse unless `DATABASE_ENV` is `dev`/`qa`, `APP_ENV` matches, and `VERCEL_ENV` is unset; `e2e/global-setup.ts` line 8 skips unless `E2E_READY=1`; `packages/shared` env parsing refuses live Clerk keys outside prod. The safety rails are built; only the job is missing. `docs/testing.md` line 77 says this is "a human workflow change".

**Smallest design (effort: small–medium, plus human steps):**

- **Separate job** `integration` in `ci.yml`, after `validate`, `needs: validate`, on `pull_request` and `push: main` only. Keep the existing secret-free `validate` job untouched so Dependabot and fork PRs still get a gate.
- **Skip for Dependabot** (`if: github.actor != 'dependabot[bot]'`) — Dependabot PRs cannot read repository secrets anyway, so the job would always fail there.
- **GitHub Environment named `qa`** holding the secrets, so they are scoped to this job and *not* readable by the Claude workflow (which has no `environment:` and must stay that way). Secrets: `DATABASE_URL` (a dedicated **Neon `qa` branch**, never main/prod), `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` from Clerk's **development** instance, and the E2E test-user credentials that `@clerk/testing` expects. Plain variables: `DATABASE_ENV=qa`, `APP_ENV=qa`, `E2E_READY=1`.
- **Steps:** install → `pnpm --filter web db:migrate -- --env=qa` → `pnpm --filter web test:integration` → `pnpm --filter web test:e2e` (Playwright starts `next dev` itself; add `npx playwright install --with-deps chromium`).
- **What must never happen:** no `prod` or `stage` value anywhere in the workflow (the repo's own `security.test.ts` already fails the build if a workflow mentions production credentials); no `VERCEL_ENV`; the Neon `qa` branch is reset by `db:reset -- --env=qa` at job start so runs don't accumulate data.
- **Make it a required check** in the ruleset only after it has been green for a week; until then it is informational.

**Human steps:** create the Neon `qa` branch; create the Clerk dev test user; add the `qa` GitHub Environment and its secrets; later add `integration` to the ruleset's required checks.

---

## 3. Security gaps before real users

`docs/security.md` "Gaps" states all three honestly (PROVED): "Rate limiting, security headers/CSP, audit logging, and automated dependency scanning in CI are not configured." `next.config.ts` has no `headers()`.

| Gap | Smallest sensible fix for this stack | Effort | When |
|---|---|---|---|
| **Security headers / CSP** | Add a `headers()` block in `next.config.ts` for all routes: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (or `frame-ancestors 'none'`), `Permissions-Policy` (camera/mic/geolocation off). Ship CSP **report-only first** with Clerk's documented allow-list (Clerk scripts/frames/images), watch for violations in Preview, then enforce. Add one unit test that reads `next.config.ts` and asserts the header names exist, in the same style as `security.test.ts`. | small | before real users |
| **Rate limiting** | Two layers, cheapest first. (a) **Human step:** Vercel → Firewall → add a rate-limit rule on `/api/*` (per IP) — zero code, and it respects the "no new services" rule. (b) In code, the API adapter already enforces a per-user cap on proof items (`services/proof-items.test.ts`); generalise that pattern: every write endpoint gets a per-user quota in the service layer. Leave a token-bucket library until a real abuse case appears. | small (a) / medium (b) | (a) before real users; (b) when the first public write endpoint ships |
| **Vulnerability scanning** | Add one step to the `validate` job: `pnpm audit --audit-level=high --prod` (fails on known high/critical issues in runtime deps). **Human step:** GitHub → Settings → Code security → enable Dependabot *security* alerts and alert PRs (Dependabot version updates are already on, security alerts are a separate switch). Optional later: enable CodeQL default setup (one click, no workflow file). | small | now |

Not needed yet (DEFER, per the charter's "no spaceship control panel"): WAF beyond rate limits, SBOM generation, secret-scanning push protection (worth enabling in GitHub settings for free, but it duplicates `security.test.ts`).

---

## 4. What makes a SECOND app harder than it should be

The boilerplate tooling is unusually good (PROVED): `manifest.mjs` is the single list of proof-only and template-only paths; `init-app.mjs` rewrites identity (name, slug, `@scope/`, bundle id), rejects `com.example.*` and any "Signal One" identity (lines 46–48), deletes the proof slice and all migrations, and runs a leak detector (`check-boilerplate.mjs`) that flags identity, proof references and credential-shaped URLs. `docs/boilerplate.md` documents the classification. This is better than most commercial starters.

**But one large thing leaks (PROVED):**

| Finding | Evidence | Consequence |
|---|---|---|
| **B1. The Signal One Sound product mock features ship inside the boilerplate.** `components/admin`, `components/church`, `components/discover`, `components/member`, `lib/admin`, `lib/church`, `lib/discover`, `lib/member`, `app/admin`, `app/discover`, `app/dashboard/church`, `app/account` — **68 files** of church/revival/event-management UI and mock data — are in none of `PROOF_PATHS`, `REFERENCE_ONLY_PATHS` or `EXPORT_EXCLUDED_PATHS` (`manifest.mjs` lines 9–50). `docs/boilerplate.md` line 71 lists what the boilerplate keeps and does not mention them. These were added in Issues 68/70/76, *after* the extraction in Issues 51/53. | `manifest.mjs`; `docs/boilerplate.md` §Classification; nav-config lines 24–27 ("Discover", "Admin (mock)") | Every new app starts with someone else's product: a Discover page, a church dashboard and an admin mock in its navigation. The identity rewrite renames the strings but not the domain. **This is the single biggest boilerplate defect.** |
| B2. The raw-controls allowance (`REMAINING_RAW_CONTROLS`) names 9 of those product files. | `raw-controls.test.ts` lines 10–20 | If a new-app owner deletes the product features, the "allowance only shrinks" test fails until the table is edited by hand. Fixing B1 fixes this automatically if the allowance goes to zero first (Stage 2 §3). |
| B3. 75 files still contain "Signal One"/"signalone" strings in app code. | grep count (non-docs) | Expected — init rewrites them — but `lib/api/handler.ts` (2 hits) and `packages/validation/src/contracts.ts` (1 hit) are *foundation* files, so the product name is baked into shared contracts (e.g. a header or error source name). Check that the rewrite covers them; prefer a single `APP_NAME` constant. Effort small. |
| B4. `docs/boilerplate.md` "Known gaps" is itself stale: it says `deployment.md` §7 "still describes the validation workflow as planned" — it no longer does. | `boilerplate.md` Known gaps | Minor drift. |
| B5. Two TypeScript majors (web 5, mobile 6) and two React patch versions (Stage 1). | package.json files | A new app inherits a type-check split; align before export. Effort small. |

**Fix for B1 (effort: medium):** add a `PRODUCT_PATHS` list to `manifest.mjs` covering the 12 directories above plus the "Discover"/"Admin (mock)" nav entries and the `account` pages, removed by `init`, and extend `check-boilerplate.mjs` to flag `church|revival|ministry` the way it flags `proof-item`. Then re-run `pnpm test:boilerplate`, whose "export yields a Signal One-free, proof-free boilerplate" case should be extended to "product-free".

---

## 5. Final verdict

**Question:** Is this ready to be a solid boilerplate for building web AND mobile apps?

**Answer: Not yet — but it is close for web, and the gap for mobile is well-defined and bounded.** Confidence: **HIGH (≈85%)** that this picture is accurate; the remaining uncertainty is the console state no one has checked (Vercel Preview values, Neon branches, Clerk instances) and whether Clerk's bearer-token path works on the first real mobile call.

**What is already solid (KEEP):**
- Backend/API/database foundation: framework-free services, a tested API adapter with a consistent error envelope, fail-closed migrations and tooling, env validation that refuses prod misuse, client/server boundaries all enforced by tests that run on every PR.
- Supply chain and repository controls: frozen lockfile, SHA-pinned actions, Dependabot, an active ruleset with a required `Validate` check and no bypass, a tightly scoped Claude workflow.
- Boilerplate mechanism: manifest + init + leak detector + tests. The approach is right; it has one blind spot (B1).
- Honesty: the docs state their own gaps, which made this audit cheap.

**Why it is not yet a web + mobile boilerplate:** the mobile app is a shell that has never authenticated, navigated, or been built; the tests that touch real infrastructure never run automatically; the template still carries the Signal One product; and three security basics are absent.

### Must fix before building apps from it

| # | Fix | Effort | Section |
|---|---|---|---|
| 1 | Strip the Signal One product features (admin/church/discover/member) from the boilerplate export; extend the leak detector. | medium | 4 (B1) |
| 2 | Mobile walking skeleton: Clerk Expo + token into the shared client + expo-router + one EAS dev build on a real device, signed in, hitting the shared API. | medium | 1 |
| 3 | CI `integration` job with a `qa` GitHub Environment, Neon `qa` branch and Clerk dev keys, running `test:integration` and `test:e2e`. | small–medium + human steps | 2 |
| 4 | Add the missing shadcn primitives (select, checkbox, dialog, form, label, table, textarea, switch) and drive `REMAINING_RAW_CONTROLS` to zero (issue #91). | medium | Stage 2 §3 |
| 5 | Fix the rule docs: rewrite `architecture-rules.md` with real headings and no blank-line bloat; resolve the three contradictions in `testing.md`; give auth/authz one owner doc and link from the rest. | small–medium | Stage 2 §5 |
| 6 | Remove the dead `cn` dependency; align TypeScript (5 vs 6) and React versions across web and mobile. | small | Stage 2 §4, 4 (B5) |
| 7 | Security headers in `next.config.ts` (CSP report-only first) + one test asserting them. | small | 3 |
| 8 | `pnpm audit --audit-level=high` in `validate`; enable Dependabot security alerts. | small | 3 |

### Can wait (do before real users, not before building)

| # | Item | Effort |
|---|---|---|
| 9 | Vercel Firewall rate-limit rule on `/api/*`; per-user write quotas in services as endpoints appear. | small / medium |
| 10 | Post-deploy health check against `/api/v1/status` so lazy env validation cannot leave a green but broken deployment. | small |
| 11 | Ruleset: turn on "require branches to be up to date"; decide whether 0 reviewers stays policy. | human step |
| 12 | Enforce CSP (after report-only period). | small |
| 13 | Backup/restore drill on Neon, documented once. | human step |
| 14 | Decide the three failing Dependabot major-version PRs (TypeScript 7, ESLint 10, Expo 58). | human step |
| 15 | Mobile component tests and a store-ready production EAS profile with real identifiers. | medium |

### Human console steps collected across all stages
GitHub: ruleset "up to date" toggle; `qa` Environment + secrets; Dependabot security alerts; optional CodeQL. · Vercel: confirm Preview env values and `qa` mapping; Firewall rate limit. · Neon: `qa` branch; PITR/restore drill. · Clerk: dev vs prod instance, keys placed only where `docs/environment.md` says; dev test user for E2E. · Expo: EAS project id; one dev build.

---

## Response to the owner (chat message, Stage 3)

Stage 3 is done and pushed to `fable/analysis-results` as `docs/fable-analysis/stage-3-final.md`. The audit is complete.

**Final verdict:** *Not yet a solid web + mobile boilerplate — but a solid web/API/database foundation with a short, well-defined path to becoming one.* Confidence ~85%.

**The biggest surprise:** the boilerplate export still ships your product. The 68 files of church/revival/discover/admin mock features added in Issues 68–76 are not in the strip list, so every new app would start with a "Discover" page and an "Admin (mock)" menu. The init tool renames "Signal One" but not the domain. That is fix #1.

**The mobile gap is bounded:** the shared API client already has the `getToken` hook and the server already uses Clerk's `auth()`, which accepts bearer tokens. Adding Clerk Expo, wiring one function, choosing expo-router and running one dev build on a real phone would prove the whole platform story. That is fix #2.

**Eight "must fix before building apps" items**, mostly small/medium: strip product features; mobile skeleton; CI integration job (needs a `qa` Neon branch + Clerk dev keys as GitHub secrets); missing shadcn primitives to get the 17 exceptions to zero; fix the rule docs; remove dead `cn` and align TS/React versions; security headers; `pnpm audit` + Dependabot security alerts.

**Seven "can wait" items** for before real users: rate limiting (Vercel Firewall first), post-deploy health check, ruleset tweaks, enforced CSP, a restore drill, the three failing Dependabot major bumps, mobile component tests.

All three reports are on the `fable/analysis-results` branch under `docs/fable-analysis/`. Nothing in the application, workflows or configuration was changed. If you want, the next step is to turn the "must fix" list into eight GitHub issues in that order — I'd recommend #1 and #6 first because they are small and stop the template drifting further.
