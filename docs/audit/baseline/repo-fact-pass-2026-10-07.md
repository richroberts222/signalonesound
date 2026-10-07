# Current-repository fact pass (2026-10-07)

Prerequisite 1 of the reconciliation checkpoint. Audit documentation only. It refreshes repository facts that reconciliation conclusions depended on; it is not a finding set and rewrites no rule.

Evidence grades: READ (file opened), CI (GitHub Actions result read through the CI tools), NOT-VERIFIED (could not access). Checked out commit: `2d9daea` on `audit/phase-0-methodology`. `origin/main` is `31ec6ba`, equal to the audit baseline, so `main` has not moved.

## Method limits

- `pnpm` is not on `PATH` in this job and there is no `node_modules`. Nothing was installed, built or run. No test result below comes from this session. Test facts are about what exists, not whether it passes.
- `gh api` was refused for the rulesets and branch-protection endpoints, so GitHub settings are NOT re-verified. The only settings evidence remains Phase 0 facts 1, 2 and 17 (CONSOLE, 2026-10-06).
- No vendor documentation was read in this pass.

## Facts

| # | Fact | Grade |
| --- | --- | --- |
| 1 | No file in `apps/` or `packages/` contains a `"use server"` directive. There are no Server Actions. | READ (search) |
| 2 | The only route handlers are `apps/web/app/api/v1/status/route.ts` (public), `apps/web/app/api/v1/proof-items/route.ts` (GET, POST, DELETE) and a catch-all `app/api/[...path]/route.ts` returning the standard `not_found` envelope. | READ |
| 3 | All handlers are built by `createApiRoute` (`lib/api/handler.ts`). Every route must declare `auth: "required"` or `"public"`. Required routes return 401 before input parsing, input is validated with shared schemas, a 100,000-byte body cap applies, and responses carry `Cache-Control: no-store` and `X-API-Version`. | READ |
| 4 | Authorization is in the service layer. `ProofItemService` scopes list and create to the caller, and delete uses `authorize(actor, isOwner)` and then an owner-scoped delete. The acceptance suite (`proof-items.acceptance-suite.ts`) has six references to forbidden, unauthenticated or other-user cases. I did not read it in full or run it. | READ (partial) |
| 5 | Identity comes from Clerk's `auth()` (`lib/auth/server.ts`). The comment says the web session cookie and the mobile bearer token both resolve through it. No test I read exercises a real bearer token against Clerk, and the mobile app has no token source (fact 9). The bearer path is therefore not demonstrated. | READ; bearer behaviour NOT-VERIFIED |
| 6 | `apps/web/proxy.ts` runs `clerkMiddleware` and calls `auth.protect()` only for page prefixes `/dashboard`, `/account`, `/admin`, `/proof`. `/api` is matched but not protected there, so API auth rests entirely on the handler adapter. | READ |
| 7 | Pages under `app/admin`, `app/dashboard/church`, `app/discover`, `app/account` use mock data (`lib/*/mock-data.ts`, `mock-notice` components). The only real data path is the generic proof-item feature. The admin pages are protected by `proxy.ts` prefix matching. No admin role check was found; I did not search exhaustively. | READ (partial) |
| 8 | The server mutation and API boundary is therefore one pattern (versioned Route Handlers over shared contracts) and no Server Actions. This is consistent with CLAUDE.md section 6. It also means the Next.js Server Action authorization guidance has no current subject in this repo. | READ |
| 9 | Mobile (`apps/mobile`): Expo `~57.0.26`, React Native `0.86.3`, a shell with `ProofItemsScreen`. Dependencies are only expo, expo-status-bar, react, react-native and the two workspace packages. There is no Clerk package, no `expo-secure-store`, no `expo-updates`, no `expo-location`, no push or maps package, and no deep-link configuration (`associatedDomains`, `intentFilters`). `proofClient.ts` uses a `noToken` provider, so the app sends no credentials. Bundle ID and Android package are `com.example.signalone` placeholders. | READ |
| 10 | Mobile shares `@signalone/validation` and `@signalone/shared` with web, using the same API client. `boundary.test.ts` statically forbids importing `drizzle-orm`, `@neondatabase/serverless`, `server-only`, `next`, `@clerk/nextjs` and similar. | READ |
| 11 | `eas.json` defines development, qa, staging and production build profiles with `EXPO_PUBLIC_APP_ENV`. There is no submit config, no OTA channel and no runtime-version policy. | READ |
| 12 | Test infrastructure: Vitest 5 in web, mobile and (per workspace) the packages; a separate `vitest.integration.config.mts`; Playwright for e2e (`--pass-with-no-tests`); `node --test` for boilerplate tooling. 24 files match test, spec or acceptance patterns. | READ |
| 13 | `pnpm validate` is `lint`, `typecheck`, `test:run`, `test:boilerplate` and `build`. It does not call `test:integration`, `test:e2e`, `db:check` or `db:migrate:verify`. CI runs only `pnpm validate`. So integration tests, e2e and the migration verification script are not run by CI. | READ |
| 14 | Database: Drizzle with two migrations (`0000_migration_proof`, `0001_proof_item`), journal and snapshots committed. `drizzle.config.ts` states `drizzle-kit push` is never used and no script exposes it, and refuses to run against prod. Scripts exist for migrate, status, verify, check, reset, seed, refresh. Reset and seed guards refuse unless target is dev or qa, VERCEL_ENV is unset and `--env` matches. Whether `db:migrate:verify` applies from zero and detects drift was not read. | READ; behaviour NOT-VERIFIED |
| 15 | `proof_item` has an `(owner_id, label)` unique constraint and no foreign key or index on `owner_id` beyond that. There is no geospatial extension, no PostGIS migration and no event table. | READ |
| 16 | `ci.yml`: triggers on pull requests and pushes to `main`; `contents: read`; `actions/checkout@v4` and `actions/setup-node@v4` by floating tag; frozen-lockfile install; runs `pnpm validate`. No concurrency group, no required-check declaration (that lives in settings). | READ |
| 17 | `claude.yml`: `contents: write`, `pull-requests: write`, `issues: write`, `id-token: write`; job-level `DATABASE_URL` from `NEON_DEV_DATABASE_URL`; allow-list includes `Bash(pnpm *)`, `Bash(npx *)`, `git checkout`, `git cherry-pick`, `git add`, `git commit`; contains no `git merge`, no `git push`, and no install step. Floating `@v1`. No concurrency group. Unchanged from SEC/DEVOS. | READ |
| 18 | `claude-code-review.yml`: `claude_args` allows only `mcp__github_inline_comment__create_inline_comment`. Latest run on this PR concluded `success`; no review comment is visible on the PR. Unchanged from F-DEVOS-001. | READ; CI |
| 19 | There is no `CODEOWNERS` file and no `.claude/` settings directory. | READ |
| 20 | Security headers and rate limiting: `next.config.ts` sets no `headers()`. No CSP, HSTS or similar appears in app code. `rate_limited` exists only as an error code mapped to 429 in the handler; nothing produces it. Confirms F-SEC headers and rate-limit gaps as still open. | READ (search) |
| 21 | `next` is pinned at `16.3.6`. The Next.js data-security page read during the reconciliation was labelled v16.4.0. `next.config.ts` sets `agentRules: false`, which I could not explain. | READ |
| 22 | Latest CI on this PR (run 37561364657, created 2026-10-07T02:18Z): `Validate` failed at "Run validation". The log shows `test:boilerplate` with 3 of 6 tests failing (init leak check, export, credential-shaped detector) and `# pass 3, # fail 3`. This matches Q-002. I did not read lint, typecheck or test output beyond those lines; the job log's earlier steps were not examined. | CI |
| 23 | GitHub rulesets, branch protection, secret scanning, Dependabot and Actions settings: not re-verified. | NOT-VERIFIED |

## Effect on reconciliation conclusions

- **Server Actions vs shared API (open decision 1): closed for the current repo.** All mutation goes through versioned Route Handlers with a forced auth declaration. The risk is future drift, not present state. Server Actions should be ruled in or out deliberately before the first web form is built on real data. Owner-level only if Rich wants Server Actions allowed.
- **Per-resource authorization:** the pattern exists and is tested at the service and acceptance level. Cookie and bearer paths are not both exercised against Clerk, so "wrong-user tested on web and mobile paths" is not yet true.
- **Mobile:** a boundary-correct shell exists, with no auth, storage, links, push, location or OTA. All mobile controls are design-time only. Evidence for Flutter or other alternatives remains absent, and evidence for Expo fitness on location, push and Clerk is also absent. Treat Expo as the documented default, unevaluated, as the checkpoint said.
- **Migrations:** the process is stronger than prose; guard code exists. But CI does not run the verification scripts, so "CI applies migrations from zero and checks drift" is not in place.
- **CI authority:** `Validate` is red for the Q-002 leak and does not run integration, e2e or migration verification.
- **Admin pages** are mock UI behind login only. No role model exists yet; this is a precondition before any real admin data.
- **Hosting limits, Neon extensions, Clerk Expo support:** still unverified, since no vendor docs and no Neon or Clerk settings were read.

## Unverified after this pass

GitHub rulesets and branch protection; token and Actions settings; Dependabot state; Vercel project settings, env scoping and Force Promote; Neon configuration, extensions and PITR window; Clerk dashboard settings; whether any test passes locally; behaviour of `db:migrate:verify` and `db:check`; whether the Clerk bearer path accepts mobile tokens; full admin authorization coverage; all vendor documentation.
