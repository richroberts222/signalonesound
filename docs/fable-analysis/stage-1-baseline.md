# Fable Analysis — Stage 1: Baseline (cheap pass)

Branch audited: `fable/clean-audit-base` · Date: 2026-10-08 · Auditor: independent (no prior project knowledge)

**Method for this stage (budget-limited):** read `docs/fable-audit-charter.md`, `CLAUDE.md`, the file list, every `package.json`, `.github/`, lint/TS/test configs, and doc headings only. Test *titles* were listed with grep (not test bodies). No full source files were read. Everything below is labelled **PROVED** (seen directly in a file or command output) or **INFERRED** (reasonable conclusion not yet verified; Stage 2 checks it).

---

## 1. Which industry standards apply, and how

Plain-language list. "Applies to" says which part of this platform each one governs.

| # | Standard / practice | Applies to | What it means here |
|---|---|---|---|
| S1 | **OWASP ASVS / Top 10** (web app security) | Web app, API | Input validation, auth on every request, no secret leakage in errors, security headers (CSP, HSTS, frame options), rate limiting. |
| S2 | **OWASP API Security Top 10** | Shared API | Object-level authorization (users only see their own data), consistent error envelope, versioned endpoints, no mass-assignment. |
| S3 | **OWASP MASVS** (mobile app security) | iPhone, Android | No secrets in the app bundle, tokens stored in secure storage, TLS only, auth handled by a proper SDK (Clerk Expo). |
| S4 | **OAuth 2.0 / OIDC** (login standards) | Auth (Clerk) | Clerk implements these; the repo's job is to validate the session on the server, never trust the client. |
| S5 | **WCAG 2.2 AA** + iOS/Android accessibility guidelines | Web UI, mobile UI | Keyboard, labels, contrast, screen-reader support; usually enforced with lint (jsx-a11y) + automated checks (axe). |
| S6 | **12-Factor App** (config in environment) | Deployment, env | Secrets only in environment variables; validated at startup; dev/qa/stage/prod kept separate. |
| S7 | **Versioned, forward-only database migrations** | Database | Every schema change is a committed migration file; no "push" to prod; migration status is verifiable. |
| S8 | **Backup & tested restore (RPO/RTO)** | Database (Neon) | Not just "Neon has backups" — a documented and rehearsed restore. |
| S9 | **Supply-chain hygiene** (OpenSSF Scorecard, SLSA basics) | CI, dependencies | Lockfile, pinned GitHub Actions by SHA, automated dependency updates, vulnerability scanning. |
| S10 | **Trunk-based / PR workflow with branch protection** | GitHub | `main` protected, required CI check, no direct pushes, reviews. |
| S11 | **Semantic versioning + API versioning policy** | Shared API, mobile | Old app-store builds keep working; breaking changes get a new API version. |
| S12 | **Test pyramid** (unit → integration → E2E) | All code | Fast unit tests in CI; real-DB integration and browser E2E run on every PR, not only locally. |
| S13 | **Observability** (structured logs, error tracking, SLOs) | Web/API in production | Know when prod breaks; no PII in logs. |
| S14 | **Privacy basics** (GDPR/CCPA-style: export, delete, retention) | Database, auth | Needed before real user data; decisions on retention and deletion. |
| S15 | **App Store / Google Play policies** | Mobile release | Privacy manifests, account deletion in-app, signed builds (EAS). |
| S16 | **Conventional, reviewable commits + docs-as-code** | Repo | Docs change with code; drift is a defect. |

---

## 2. What rule sets the repository defines for itself

**PROVED structure:** `CLAUDE.md` (21 numbered sections, ~370 lines) is the entry point and delegates to `/docs/*.md`. The docs total **~7,900 lines across 40+ files**. Largest: `architecture-rules.md` (1,100), `data-mutations.md` (908), `database.md` (648), `ui.md` (639), `data-fetching.md` (628).

Observations from headings and sizes only:

- **R-DOC-1 (PROVED)** `docs/routing.md` and `docs/server-components.md` are **0 bytes** but are listed in `CLAUDE.md` as expected rule documents. CLAUDE.md explicitly says empty files mean "no rules yet", so this is *consistent*, but it is a gap an agent will keep bumping into.
- **R-DOC-2 (PROVED)** `docs/architecture-rules.md` sections 1–21 are not real Markdown headings — the file uses `**# Title**` (bold-wrapped) and has triple blank lines, so a heading grep only finds sections 22–29 at line 949+. The document the whole system calls "primary authority" is the hardest one to navigate. Consequence: humans and tooling cannot index it; drift goes unnoticed. *When it matters: now (it is the top rule file).*
- **R-DOC-3 (INFERRED)** Heavy duplication is likely: `data-fetching.md` and `data-mutations.md` both have ~23 numbered sections covering auth, authorization, validation, errors; `database.md`, `architecture-rules.md` §22–28 and `environment.md` all cover environments. Stage 2 samples specific overlaps.
- **R-DOC-4 (PROVED)** Several docs self-report their own status: `security.md` has a "Gaps (not yet implemented)" section; `deployment.md` has "Verified vs not verified" and "Mobile deployment boundary (not built)"; `mobile.md` has "Builds (prepared, not exercised)" and "Remaining scaffolding work"; `api.md` and `services.md` have "Not decided yet". This is a healthy sign of honesty — the docs do not overclaim.
- **R-DOC-5 (PROVED)** `docs/notes.md` holds Issue-76 working notes, including "pnpm is not on PATH in this sandbox". CLAUDE.md says notes.md is optional and for non-discoverable info only; this content is partly transient status. Minor drift.
- **R-DOC-6 (PROVED)** `docs/code-quality-audit.md` exists and `CLAUDE.md` §20 references it inside `boilerplate:reference` markers — meaning the export tooling strips it from the boilerplate. Good design.

---

## 3. Rules vs. enforcement — one line per important rule

Legend: **Enforced-test** = a committed test whose title asserts the rule (PROVED the test exists; its strength is checked in Stage 2). **CI** = runs on every PR via `pnpm validate`. **Config** = enforced by a config file. **Doc only** = written down, nothing checks it. **UNVERIFIED** = depends on a console a human must check.

| ID | Rule (where written) | Enforced? | Evidence |
|---|---|---|---|
| E1 | No real secrets / credential-shaped URLs in committed files (CLAUDE.md §18) | **Enforced-test + CI** | `apps/web/lib/security.test.ts` ("committed files contain no real secrets", ".env.example holds placeholders only"); `.gitignore` ignores `.env*` except examples; boilerplate detector test. |
| E2 | Server secrets / DB access stay server-side; clients never read secrets (CLAUDE.md §6–7) | **Enforced-test + CI** | `lib/env/boundary.test.ts`, `lib/auth/auth.test.ts` ("client/server boundary"), `security.test.ts` ("server-only modules"), `packages/shared` "never import server-only or read process.env". |
| E3 | Mobile imports no server/Next/DB/apps-web code; reads only `EXPO_PUBLIC_*` (docs/mobile.md) | **Enforced-test + CI** | `apps/mobile/src/boundary.test.ts`. |
| E4 | Every UI control is shadcn/ui; no raw `<button>`/`<input>` outside `components/ui` (docs/ui.md §2–3) | **Enforced-test + CI, with an allowance** | `components/ui/raw-controls.test.ts` — "adds no raw controls … never exceeds the allowance" and "allowance … only shrinks". So the rule is *ratcheted*, not absolute (INFERRED: a known count of exceptions exists; Stage 2 reads the number). |
| E5 | `cn` must come from `@/lib/utils`, not the npm `cn` package | **Enforced-test** — but **contradicted by config** | `components/ui/imports.test.ts` enforces it, yet `apps/web/package.json` still declares `"cn": "^0.4.0"` as a dependency. PROVED dead/contradictory dependency (the earlier audit's "unnecessary cn" concern is confirmed). |
| E6 | Service layer is framework-free (no Next, Clerk, DB client, FormData, process.env) (docs/services.md) | **Enforced-test + CI** | `lib/services/services.test.ts` "service layer boundaries (static)". |
| E7 | API adapter is framework-free, fails closed 401 before input/DB, standard envelope, no echo of input in errors (docs/api.md) | **Enforced-test + CI** | `lib/api/api.test.ts`, `app/api/routes.test.ts`, `app/api/v1/proof-items/route.test.ts`. |
| E8 | Unexpected errors reported without message/stack/SQL leakage (docs/api.md, security.md) | **Enforced-test + CI** | `lib/api/report.test.ts`, `db/db.test.ts`. |
| E9 | Migrations only via committed files; `drizzle-kit push` never exposed; prod never targeted by tooling (docs/database.md §10–12) | **Enforced-test + CI** | `db/tooling/migrate.test.ts` ("refuses prod", "never exposes drizzle-kit push"), `tooling.test.ts`. |
| E10 | Env validated at startup; prod/non-prod cross-wiring refused; live Clerk keys refused outside prod (docs/environment.md) | **Enforced-test + CI** | `packages/shared/src/env.test.ts` (216 lines of cases). |
| E11 | Every top-level route has an explicit protection decision (docs/auth.md §10) | **Enforced-test + CI** | `apps/web/proxy.test.ts` "makes a protection decision for every top-level route in app/". |
| E12 | Ownership/authorization from server context, never caller input (docs/data-mutations.md §8) | **Enforced-test + CI** (unit, with fakes) | `auth.test.ts` "authorization primitives", `services.test.ts` "derives ownership from the context". |
| E13 | GitHub Actions pinned to commit SHA; Claude workflow has no merge/wildcard tooling | **Enforced-test + CI** | `security.test.ts` "workflow safety"; `ci.yml`/`claude.yml` show SHA pins (PROVED). |
| E14 | Dependency updates | **Config** | `.github/dependabot.yml` weekly, npm + actions, grouped. No vulnerability *scanning* (no `pnpm audit` in CI, no CodeQL) — PROVED absent from workflows. |
| E15 | `main` is protected; required `Validate` check; Claude never merges (CLAUDE.md §19, git-workflow.md §1, §20) | **UNVERIFIED (GitHub console)** | `ci.yml` job is named `Validate` (matches). Branch protection/ruleset cannot be seen from the repo. **Human step:** GitHub → Settings → Rules/Branches: confirm ruleset on `main` requires `Validate`, blocks force-push, requires PR. |
| E16 | Integration tests against a real DB and Playwright E2E exist (docs/testing.md) | **Doc + local only — NOT in CI** | `pnpm validate` = lint, typecheck, unit `test`, boilerplate test, build. `test:integration` and `test:e2e` are separate scripts never invoked by `ci.yml`. PROVED. Consequence: the only tests that touch Neon/Clerk/browser never run automatically. |
| E17 | Code coverage rules (docs/automation/coverage.md) | **Doc only** | No `coverage` block in any vitest config (PROVED). |
| E18 | Accessibility (docs/ui.md §9) | **Partially by lint (INFERRED)** | `eslint-config-next/core-web-vitals` includes some `jsx-a11y` rules; no axe/Playwright a11y checks; no mobile a11y checks. |
| E19 | Security headers / CSP (security.md "Gaps") | **Not in place** | `next.config.ts` has no `headers()`; no middleware headers seen in file list. PROVED absent from config; self-reported as a gap. |
| E20 | Rate limiting / abuse controls | **Not in place (INFERRED)** | No rate-limit dependency or module in file list. |
| E21 | Docs stay synchronized with code (CLAUDE.md §9, §19) | **Doc only** | No link checker, no doc-vs-code test. |
| E22 | Naming conventions (docs/naming-conventions.md) | **Doc only** | No lint rule. |
| E23 | One issue = one branch = one PR; Vercel preview reviewed before merge | **Process only / UNVERIFIED (Vercel)** | **Human step:** Vercel project → confirm Git integration, preview deploys on PRs, and env vars per environment match `docs/environment.md`. |
| E24 | Mobile auth via Clerk (docs/auth.md §2 "Multi-Client Authentication") | **Not implemented** | `apps/mobile/package.json` has no `@clerk/clerk-expo`; test title "sends no Authorization header until Clerk is integrated". PROVED. |
| E25 | Mobile builds (EAS) | **Prepared, not exercised (self-reported)** | `eas.json` exists; docs say never run. **Human step:** Expo/EAS account, Apple/Google developer accounts. |
| E26 | Backup / restore procedure (database.md §4) | **UNVERIFIED (Neon console) / Doc only** | No restore script or drill record in repo. **Human step:** Neon → confirm PITR window; run one restore drill into a branch. |
| E27 | TypeScript strict in every package | **Config + CI** | All four `tsconfig.json` have `"strict": true` (PROVED); `typecheck` is in `validate`. |
| E28 | Lockfile integrity | **CI** | `pnpm install --frozen-lockfile` in `ci.yml` (PROVED). |

**Summary count:** 28 important rules → 15 enforced by test/config in CI, 2 enforced but with a caveat (E4 allowance, E5 contradiction), 5 doc-only, 4 UNVERIFIED console state, 3 not implemented.

---

## 4. Required technology — in place and used as the rules say?

| Tech | Present? | Used as rules say? | Evidence |
|---|---|---|---|
| Next.js (App Router) | **Yes** — `next 16.3.6`, `app/` directory | Yes (INFERRED from file layout; server/client boundary tests exist) | `apps/web/package.json`, `apps/web/app/**` |
| React / TypeScript | **Yes** | Version split: web React 19.2.8, mobile React 19.2.3; web TS ^5, mobile TS ~6.0.3; `@types/node` ^20 in web vs Node 24 engine. **INFERRED risk:** shared packages are type-checked under two TypeScript majors. | package.json files |
| shadcn/ui | **Yes** — `shadcn ^4.21`, `components.json` (style base-nova, `@base-ui/react`), 6 primitives in `components/ui` (avatar, badge, button, card, input, tabs) | **Mostly** — conformance test exists with an allowance. Only 6 primitives for ~34 feature components; INFERRED that forms, selects, dialogs, checkboxes may be hand-rolled or absent. Stage 2 reads the allowance list. | `components.json`, `raw-controls.test.ts` |
| Expo / React Native | **Yes** — Expo ~57, RN 0.86 | **Shell only** — 7 source files, one proof screen, no navigation library, no Clerk. Self-described "Foundation shell only; no domain features." | `apps/mobile/package.json` description |
| Clerk | **Web: yes** (`@clerk/nextjs ^7.9.7`, `@clerk/testing`, sign-in/up routes) · **Mobile: no** | Web: yes (auth tests, proxy test). Mobile: missing — the "one platform, shared auth" promise is not yet true. | package.json, `proxy.ts`, test titles |
| Neon | **Yes** — `@neondatabase/serverless`, `neon-http` driver | Yes; note the test "driver decision (neon-http) has no interactive transactions; atomic writes use db.batch" — a real constraint the rules acknowledge (multi-step writes can't use SQL transactions). | `db/db.test.ts` title |
| Drizzle | **Yes** — `drizzle-orm ^0.45`, `drizzle-kit`, 2 committed migrations, journal | Yes; migration/tooling tests are the strongest in the repo. | `apps/web/drizzle/**`, `db/tooling/**` |
| Vercel | **Referenced** in docs/env parsing (refuses Preview→prod) | **UNVERIFIED** — no `vercel.json`; deployment is console-configured. | `env.test.ts` titles; human step E23 |
| pnpm workspace | **Yes** — `pnpm@12.6.0`, 2 apps + 2 packages | Yes | `pnpm-workspace.yaml` |
| GitHub + Claude Code action | **Yes** — SHA-pinned, scoped allowed-tools | Yes; `contents: write` is granted to the Claude job (needed for branch pushes); merge is excluded by allow-list. | `claude.yml` |

---

## 5. Early verdict (Stage 1) — confidence: **MEDIUM (≈60%)**

**What is fine (and better than most starters):**
- Secrets, environment identity, client/server boundary, DB-tooling safety and API error hygiene are *tested*, not just documented — this is the repo's real strength (E1–E3, E6–E13).
- Supply chain basics are right: lockfile frozen, actions SHA-pinned, Dependabot on, Claude action tightly scoped.
- TypeScript strict everywhere; one `pnpm validate` gate runs on every PR.
- Docs are honest about their own gaps.

**What blocks "solid boilerplate for web AND mobile" today (ordered by impact):**
1. **Mobile is a shell, not a client.** No Clerk on mobile, no navigation, no exercised build. The platform story ("one backend, three clients, shared auth") is proven only for web. *Before building apps.*
2. **The tests that touch real infrastructure never run in CI** (integration + E2E). A green PR proves nothing about Neon, Clerk or the browser flow. *Before building apps.*
3. **Branch protection, Vercel env mapping, Neon backups are unverified** — the safety model assumes them. *Human console checks, now.*
4. **No security headers / CSP, no rate limiting, no vulnerability scanning.** *Before real users.*
5. **The primary rule file is unreadable by tooling** (R-DOC-2) and the doc set is ~8k lines with likely duplication — expensive for an agent to obey and easy to drift. *Soon.*
6. **Small contradictions that erode trust in the rules:** dead `cn` dependency (E5), two TypeScript majors, `@types/node` behind the engine, empty rule files still listed as authorities.

**Early verdict:** *Promising foundation for a web boilerplate; not yet a web+mobile boilerplate.* The backend/API/DB/security scaffolding is solid and unusually well-tested. The mobile half and the CI coverage of real-infrastructure tests are the gap between "good web starter" and "solid platform boilerplate".

**Stage 2 will:** run `pnpm validate` here; read the raw-controls allowance; sample `security.test.ts`, `proxy.ts`, `services.test.ts` static checks and `env.ts` by line range; spot-check doc duplication and the `architecture-rules.md` formatting; and confirm whether integration/E2E can run at all without live services.
