# Baseline: Inventory (Pass 1)

What exists at baseline `31ec6ba` (2026-10-06). Facts only. Sizes are line counts of committed text files (`find | wc -l`), excluding `node_modules`.

## 1. Components

| Area | Files | Lines | What it is | Subject |
| --- | --- | --- | --- | --- |
| `apps/web/app` | 30 | 1,367 | Next.js 16 App Router: home, sign-in/up, `/discover` (+ event detail), `/dashboard` (+ `/dashboard/church/**`), `/account` (+ notifications), `/admin/**` (overview, organizations, events, submissions, import), `/proof`, `/api/v1/status`, `/api/v1/proof-items`, `/api/[...path]` 404 catch-all | ARCH, UX |
| `apps/web/components` | 39 | 3,281 | `ui/` (shadcn: avatar, badge, button, card, input, tabs), `shell/` (app shell, header), `brand/` (wordmark), feature folders `discover/`, `church/`, `member/`, `admin/` (all mock), `proof/` | UX, CODE |
| `apps/web/lib` | 52 | 3,610 | `api/` (framework-free adapter, route wiring, unexpected-error reporter, proof routes and acceptance suite), `auth/` (Clerk server helpers, pure authorization primitives, errors), `services/` (context, errors, `runService`, `AtomicRunner`, proof service), `env/` (server/client env), `composition.ts` (composition root), `navigation/`, `clerk-appearance.ts`, `utils.ts` (`cn`), mock feature logic in `discover/`, `church/`, `member/`, `admin/` | ARCH, AUTH, CODE |
| `apps/web/db` | 18 | 952 | `client.ts` (neon-http Drizzle), `index.ts` (server-only `getDb`), `env.ts`, `errors.ts`, `health.ts`, `schema.ts` (`migration_proof`, `proof_item`), `proof-items.ts` repo + fake, `tooling/` (guard, executor, migrate, reset, seed, cli) | DATA |
| `apps/web/drizzle` | 5 | – | migrations `0000_migration_proof.sql`, `0001_proof_item.sql`, journal and snapshots | DATA |
| `apps/web/scripts` | 7 | 128 | `db-check`, `db-migrate`, `db-migrate-status`, `db-migrate-verify`, `db-reset`, `db-seed`, `db-refresh` (tsx entry points) | DATA |
| `apps/web/e2e` | 2 | 127 | Playwright global setup (Clerk testing) and the proof-items journey | TEST |
| `apps/web/proxy.ts`, `next.config.ts` | 2 | – | Clerk middleware protecting `/dashboard`, `/account`, `/admin`, `/proof`; `agentRules: false`, `transpilePackages` | AUTH, REL |
| `apps/mobile/src` | 7 | 273 | Expo SDK 57 shell: `App.tsx`, `config/env.ts`, `proof/` client and screen, boundary and env tests | ARCH |
| `packages/shared/src` | 12 | 682 | `env.ts` (244 lines: all environment parsing and guards), `result.ts`, `contracts.ts`, `constants.ts`, `utils.ts`, `testing/` (test-only subpath) | ARCH, SEC |
| `packages/validation/src` | 9 | 434 | Zod building blocks, `parseInput`, `createApiClient`, proof-item contracts and client | ARCH |
| `scripts/boilerplate` | 11 | 735 | `manifest.mjs`, `init-app.mjs`, `check-boilerplate.mjs`, `export-template.mjs`, `prove-init.mjs`, self-test, templates (`composition.ts`, `schema.ts`, `App.tsx`, standalone docs) | BOIL |
| `.github/workflows` | 3 | 133 | `ci.yml`, `claude.yml`, `claude-code-review.yml` | SEC, REL, DEVOS |
| `docs` (excluding `docs/audit`) | 49 | ~8,200 | rules, product plan, automation docs, ideas, charter; two files empty (`routing.md`, `server-components.md`) | DEVOS |
| Root | – | – | `CLAUDE.md` (14.5 KB), `README.md`, `package.json`, `pnpm-workspace.yaml` (`allowBuilds` denies esbuild, sharp, unrs-resolver build scripts), `pnpm-lock.yaml` (421 KB), `.gitignore` | DEVOS |

Source lines (`.ts`, `.tsx`, `.mjs`, all workspaces and scripts): 12,115, of which about 2,900 are tests, fakes, acceptance suites, and test helpers. Largest source files: `components/church/event-editor.tsx` (413), `components/admin/import-wizard.tsx` (323), `lib/discover/mock-data.ts` (319), `lib/admin/mock-data.ts` (273), `packages/shared/src/env.ts` (244).

Product code status: every product route (`discover`, `dashboard/church`, `account`, `admin`) is a mock with static fictional data and client-local state; no product table, migration, API endpoint, or service exists. The only end-to-end slice is the disposable `proof-item` feature.

## 2. Workspaces and scripts

| Workspace | Package manager | Scripts |
| --- | --- | --- |
| root `signalone` | pnpm 12.6.0 pinned via `packageManager` (Corepack) | `dev`, `build` (web only), `lint`, `typecheck`, `test`/`test:run`, `test:watch`, `init:app`, `check:boilerplate`, `export:boilerplate`, `prove:init`, `test:boilerplate`, `validate` = lint → typecheck → test:run → test:boilerplate → build |
| `web` | – | `dev`, `build`, `start`, `lint`, `typecheck` (`next typegen && tsc --noEmit`), `test`, `test:watch`, `test:integration`, `test:e2e` (`--pass-with-no-tests`), `db:generate`, `db:migrate`, `db:migrate:status`, `db:migrate:verify`, `db:check`, `db:reset`, `db:seed`, `db:refresh` |
| `mobile` | – | `start`, `android`, `ios`, `lint`, `typecheck`, `test`, `test:watch`, `check:deps`, `export` |
| `@signalone/shared`, `@signalone/validation` | – | `typecheck`, `test`, `test:watch`; consumed as TypeScript source (no build) |

## 3. Dependencies

Declared direct dependencies (`pnpm ls -r --depth 0`, 50 packages across 5 projects):

| Workspace | Runtime | Dev |
| --- | --- | --- |
| web | `@base-ui/react` 1.8.0, `@clerk/nextjs` 7.9.7, `@neondatabase/serverless` 1.1.0, `class-variance-authority` 0.7.1, `clsx` 2.1.1, **`cn` 0.4.0** (declared, imported nowhere; `components/ui/imports.test.ts` asserts components import `cn` from `@/lib/utils`, not the package), `drizzle-orm` 0.45.3, `lucide-react` 1.48.0, `next` 16.3.6 (exact), `react`/`react-dom` 19.2.8 (exact), `server-only` 0.0.1, **`shadcn` 4.21.0 (the CLI, in runtime dependencies)**, `tailwind-merge` 3.7.0, `tw-animate-css` 1.4.0, `zod` ^4 | `@clerk/testing`, `@playwright/test` 1.63.0, `@tailwindcss/postcss`, `@types/*`, `dotenv` 18, `drizzle-kit` 0.31.11, `eslint` 9, `eslint-config-next`, `tailwindcss` 4, `tsx`, `typescript` 5.9.3, `vitest` 5.0.2 |
| mobile | `expo` ~57.0.26, `expo-status-bar`, `react` 19.2.3 (exact; differs from web's 19.2.8), `react-native` 0.86.3 | `eslint-config-expo`, `typescript` ~6.0.3 (differs from the other workspaces' 5.9.3), `vitest`, `@types/*` |
| validation | `zod` ^4 | `typescript`, `vitest` |
| shared | none | `typescript`, `vitest` |

Version ranges: most runtime dependencies use caret ranges; `next`, `react`, `react-dom` are exact in web; the lockfile pins everything and CI installs with `--frozen-lockfile`.

`pnpm outdated -r` (2026-10-06): 19 direct packages behind, mostly patch or minor; majors available for `eslint` (9 → 10), `typescript` (5.9/6.0 → 7.0), `@types/node` (20/22 → 26).

`pnpm audit` (2026-10-06): **6 advisories** (4 high, 2 moderate); `pnpm audit --prod`: 5 (4 high, 1 moderate). All are transitive: `node-forge` via `expo` CLI (no patch), `braces` via `shadcn` → `fast-glob` (no patch), `source-map-js` via `vitest` → `vite` → `postcss`, `@modelcontextprotocol/sdk` via `shadcn`, `esbuild` via `drizzle-kit`, `uuid` via `expo` config plugins. The "prod" view counts `shadcn` and `expo` because they are declared as runtime dependencies. `docs/security.md` records "no known vulnerabilities" from Issue 26 (2026-10-01).

Supply-chain controls present: committed lockfile, pinned pnpm, `allowBuilds` deny-list for postinstall scripts, GitHub secret scanning. Absent: Dependabot/Renovate, `pnpm audit` in CI, SHA-pinned actions, SBOM/provenance, CodeQL.

## 4. Workflows

| Workflow | Trigger | Permissions | Secrets | Notes |
| --- | --- | --- | --- | --- |
| `ci.yml` | `pull_request`, `push` to `main` | `contents: read` | none | `pnpm install --frozen-lockfile` then `pnpm validate`; Node 22; `actions/checkout@v4`, `actions/setup-node@v4` |
| `claude.yml` | issue/PR comments, reviews, review comments containing `@claude`; issues opened/assigned | `contents`, `pull-requests`, `issues`, `id-token`: write; `actions: read` | `CLAUDE_CODE_OAUTH_TOKEN`; `NEON_DEV_DATABASE_URL` as `DATABASE_URL` at job level with `DATABASE_ENV: dev` | `anthropics/claude-code-action@v1`; `fetch-depth: 0`; allow-list `gh pr *`, `pnpm *`, `npx *`, `corepack *`, `git fetch/branch/log/show/diff/checkout/cherry-pick/add/commit/status`; **no `git merge`/`merge-base`** although `docs/issues.md` requires them |
| `claude-code-review.yml` | every PR opened/synchronized/reopened/ready | `contents`, `pull-requests`, `issues`: read; `id-token: write` | `CLAUDE_CODE_OAUTH_TOKEN` | `/code-review:code-review --comment`; `allowed_bots: claude`; allowed tool: inline comment creation |

Repository-level Actions settings are in `external-state.md` (default token permission write; all actions allowed).

## 5. Tests

Default run (`pnpm test:run`, what CI runs), counted from the Vitest summaries on 2026-10-06:

| Workspace | Files | Tests | What they protect |
| --- | --- | --- | --- |
| `packages/shared` | 4 | 39 | env parsing and every production guard (27), contracts (3), test-setup isolation (5), utils (4) |
| `packages/validation` | 3 | 24 | common schemas (8), envelope/pagination/`parseInput` (10), proof contracts and shared API client (6) |
| `apps/mobile` | 3 | 10 | static backend boundary (4), env parsing (3), proof client (3) |
| `apps/web` | 21 | 171 | API adapter lifecycle, envelope, status mapping, static boundary (16); route wiring (2+1); unexpected-error reporting (5); auth helpers and authorization primitives with Clerk mocked (13); service conventions, `toAppError`, atomic runner, static boundary (15); proof service with fake repo (6); proof acceptance suite in memory (AC1 to AC9 via the suite); database error handling and driver decision (6); migration guard/status/verify/journal/no-push (14); reset/seed guard and executor (13); env client/server boundary (5); security static checks (13); feature-component `'use client'` guard (4 dirs); `components/ui` import guard (1); mock logic for admin (11), church (12), discover (7+2), member (6), navigation (4) |
| **Total** | **31** | **244** | |

Not in the default run: `apps/web/db/proof-items.integration.test.ts` (4 tests, real dev/qa database, `test:integration`), `apps/web/e2e/proof-items.spec.ts` (3 Playwright tests, Clerk dev test user, `test:e2e`), `scripts/boilerplate/boilerplate.test.mjs` (6 `node:test` tests, in `pnpm validate` via `test:boilerplate` but not in `pnpm test`).

Test tooling: Vitest 5 everywhere, node environment (no DOM; no `.test.tsx` files exist), one shared setup file that clears environment identity and credentials before each test. No coverage threshold. No React Native component runner. No a11y automation. No contract/schema snapshot tests.

Static "tripwire" tests (text scans, do not follow imports): `apps/web/lib/security.test.ts`, `lib/env/boundary.test.ts`, `components/discover/server-boundary.test.ts`, `components/ui/imports.test.ts`, `lib/api/api.test.ts` (static part), `lib/services/services.test.ts` (static part), `lib/auth/auth.test.ts` (static part), `apps/mobile/src/boundary.test.ts`.

## 6. Documentation

| Group | Files | Lines | Notes |
| --- | --- | --- | --- |
| Rules referenced by `CLAUDE.md` | 24 | ~6,800 | `architecture-rules.md` 1,100 (sections 1 to 21 use a non-`#` heading style; only 22 to 29 are Markdown headings), `data-mutations.md` 908, `database.md` 648, `ui.md` 637, `data-fetching.md` 628, `git-workflow.md` 460, `auth.md` 400 |
| Empty | 2 | 0 | `routing.md`, `server-components.md` (listed in `CLAUDE.md`; empty since 2026-09-28) |
| Automation | 8 | 250 | test layers, Test Value Review, reporting, coverage, Playwright |
| Product | 4 | ~720 | plan (266), source plan (403), roadmap (37), features README (13; no specs exist) |
| Boilerplate | 5 | ~360 | `boilerplate.md`, gap report (historical), references report, customization map, new-app setup |
| Ideas | 5 | ~125 | vendor-neutral parking lot |
| Notes | 1 | 38 | Issue 76 handoff notes (merged PR) |
| Charter | 1 | 177 | `fable-audit-charter.md` |
| Audit | this directory | – | |

Markers: `boilerplate:proof`, `boilerplate:template`, `boilerplate:reference` regions appear inside `README.md`, `CLAUDE.md`, and 10 docs; init and export strip them.

## 7. Validation commands at the baseline (RUN, 2026-10-06, Windows 10, Node 22, pnpm 12.6.0 via Corepack)

| Command | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | OK; lockfile up to date; pnpm reports 12.9.1 available |
| `pnpm lint` | OK (web, mobile) |
| `pnpm typecheck` | OK (all four workspaces; `next typegen` succeeded) |
| `pnpm test:run` | shared 39/39, validation 24/24, mobile 10/10, **web 167/171: 4 failures**, all Windows path-separator false failures in `lib/security.test.ts` (3) and `lib/env/boundary.test.ts` (1): expected `db/index.ts`, received `db\index.ts`; the test-code exemption regexes use forward slashes, so `packages/shared/src/testing/index.ts` (a fake fixture) is flagged for its fake connection string and `db/client.ts` for `DATABASE_URL`. Identical with and without `docs/audit/`. |
| `pnpm validate` | stops at the test step on Windows (above). On Linux CI the same gate passed on `31ec6ba` (CONSOLE: `Validate=success` on the merge commit of PR #80), so the gate is green on the platform that matters and red on the developer's platform. |
| `pnpm test:boilerplate` | 5 of 6 pass; **"export yields a Signal One-free, proof-free boilerplate" fails on Windows**: the exported `README.md` lacks the injected "Template repository" block. The working copy has CRLF line endings (`core.autocrlf=true`, no `.gitattributes`, index is LF) and the README block replacement does not match CRLF text. Fails identically with the audit directory stashed; passes in Linux CI at the baseline. |
| `pnpm build` | OK: compiled in 26 s; 38 pages generated; 24 routes (3 static: `/_not-found`, `/discover`, `/proof`; the rest dynamic); Proxy (middleware) present. Run with the local `.env.local` present, so this is not itself a proof of a secret-free build (CI is). |
| `pnpm audit` / `--prod` | 6 / 5 advisories (section 3) |
| `pnpm check:boilerplate` | 171 finding lines on the template (expected by design: identity and proof references); 3 lines are in `docs/audit/` |
| `pnpm --filter web db:check` | OK, `dev`, `SELECT 1` |
| `db:migrate:status --env=dev` / `db:migrate:verify --env=dev` | 2 applied, 0 pending; database matches the journal |
| `pnpm export:boilerplate --out=<temp>` | OK: "applied neutral identity to 94 files". The export tree contains **no** `.env.local` (checked). `check:boilerplate --dir=<export>` reports only neutral-identity and template-only hits, as the self-test expects. |

Not run (forbidden or not provisioned): `test:integration`, `test:e2e`, `db:migrate/reset/seed/refresh`, `prove:init --full`, mobile `export` (needs `EXPO_PUBLIC_*`), any Vercel command.

## 8. Boilerplate export drift (RUN, fresh export vs published `fullstack-boilerplate`)

52 differing paths (`diff -rq`, excluding `.git`):

* **Only in the fresh export (24)**: `apps/web/app/{account,admin,discover,dashboard/church}`, `apps/web/components/{admin,brand,church,discover,member,shell}`, `apps/web/components/ui/{badge,input,tabs}.tsx` and `imports.test.ts`, `apps/web/lib/{admin,church,discover,member,navigation}`, `docs/audit`, `docs/code-quality.md`, `docs/fable-audit-charter.md`, and two generated files (`apps/web/next-env.d.ts`, `apps/web/tsconfig.tsbuildinfo`) copied from the working tree. In other words, the current export carries every Signal One Sound mock feature into the "generic" boilerplate because none of those paths is in `PROOF_PATHS`, `REFERENCE_ONLY_PATHS`, or `EXPORT_EXCLUDED_PATHS`.
* **Only in the published copy (1)**: `apps/web/components/auth` (since replaced by `components/shell`).
* **Changed (27)**: `.gitignore`, `CLAUDE.md`, `package.json`, `apps/web/app/{dashboard/page,globals.css,layout,page}.tsx`, `apps/web/components/ui/{avatar,button,card}.tsx`, `apps/web/proxy.ts`, 14 docs, `scripts/boilerplate/{init-app,manifest}.mjs`.
