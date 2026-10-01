# Handoff Notes

## Issue

#51 Extract and Prove Reusable Application Boilerplate

* Canonical branch: `claude/issue-51-20261001-2013`
* PR: not opened by Claude; a prefilled "Create a PR" link is in the issue comment. Human merges.
* Latest commit: see `git log -1` on the branch (the final commit also contains this file).

## Work completed

* **Mechanism (simplest that works):** a few dependency-free Node scripts in `scripts/boilerplate/`, no generator framework. `pnpm init:app` turns a fresh copy into a generic app; `pnpm check:boilerplate` detects leaks; `pnpm prove:init [--full]` repeats the functional proof; `pnpm test:boilerplate` (in `pnpm validate`/CI) self-tests the tooling.
* **Docs:** `docs/boilerplate.md` (template-only: mechanism, classification, maintenance; deleted by init), `docs/new-app-setup.md` (kept by new apps: Clerk, Neon, Vercel, EAS steps and where each value belongs). README index/section updated. Proof-slice and template prose in existing docs is wrapped in `<!-- boilerplate:proof|template:start/end -->` markers that init strips.
* **Reusable defects fixed (not worked around):**
  * `db:migrate:verify` hard-coded the `migration_proof` table; now schema-agnostic (`verifyMigrationState`: nothing pending, no unknown history).
  * `readJournal` tolerates a missing journal (a new app has no migrations).
  * `test:integration` and `test:e2e` no longer fail when a new app has no such tests yet (`passWithNoTests` / `--pass-with-no-tests`).
  * `createProofItemClient` moved out of generic `api-client.ts` into proof-only `proof-item-client.ts`; the proof route-wiring test moved next to its route; a proof-named operation string in `report.test.ts` made generic. Behavior unchanged.

## Files changed

New: `scripts/boilerplate/{manifest,init-app,check-boilerplate,prove-init}.mjs`, `scripts/boilerplate/boilerplate.test.mjs`, `scripts/boilerplate/templates/{composition.ts,schema.ts,App.tsx}`, `docs/boilerplate.md`, `docs/new-app-setup.md`, `packages/validation/src/proof-item-client.ts`, `apps/web/app/api/v1/proof-items/route.test.ts`.
Modified: root `package.json` (scripts; `validate` now includes `test:boilerplate`), `apps/web/package.json`, `apps/web/vitest.integration.config.mts`, `apps/web/db/tooling/migrate.ts`, `migrate.test.ts`, `apps/web/scripts/db-migrate-verify.ts`, `apps/web/app/api/routes.test.ts`, `apps/web/lib/api/report.test.ts`, `packages/validation/src/{api-client,index,proof-item.test}.ts`, `README.md`, and docs `api`, `database`, `mobile`, `security`, `services`, `testing`, `automation/README` (markers / de-stale wording only).
`.github/workflows` untouched (the app cannot edit them; `ci.yml` already runs `pnpm validate`, so the new self-test runs in CI automatically).

## Classification (full table in `docs/boilerplate.md`)

* **Reusable:** monorepo, web shell (Next/Tailwind/shadcn/Clerk/proxy), `lib/api|auth|services|env`, `db` + `db/tooling` and all `db:*` scripts, `packages/shared|validation` (generic parts), mobile shell + `eas.json`, Vitest/Playwright configs and `e2e/global-setup.ts`, `ci.yml`, Claude workflows, `CLAUDE.md`, all rules in `docs/`, `docs/automation/`, `docs/ideas/`.
* **Signal One specific:** only the name/identifiers (`Signal One`, `signalone`, `@signalone/*`, `com.example.signalone`, `signalone_tooling`). The repository contains **no Signal One domain code or tables**; there is nothing domain-specific to exclude yet.
* **Optional:** Playwright/dev-DB integration runs, reset/seed tooling, Expo/EAS, dashboard example page, code-review workflow.
* **Template-only:** boilerplate docs/reports and `scripts/boilerplate/`.

## Proof-only artifacts identified

Authoritative list: `PROOF_PATHS` in `scripts/boilerplate/manifest.mjs`: the `proof-item` contracts/client, API route and definitions, service, repo/fake, web `/proof` page and panel, mobile `src/proof/`, acceptance suite and all slice tests, `proof_item` and `migration_proof` tables, and **all migrations in `apps/web/drizzle/`**. A new app starts with an empty schema and no migrations; its first `db:generate` creates its own `0000`. Nothing must be dropped because the proof tables never exist in its databases.

## Initialization mechanism

`pnpm init:app --name="…" --slug=… --bundle-id=… [--scope=…] [--dry-run]` (run once in a fresh copy): removes proof and template-only paths, swaps three wiring files for domain-free templates, edits `proxy.ts`/validation index/root scripts, strips doc regions, applies identity to all text files including `pnpm-lock.yaml`, resets `docs/notes.md`, then runs the leak check and fails if anything remains. Rejects Signal One names and `com.example.*` bundle ids. Refuses to run twice.

## Example generic identity used for proof

Name "Harbor Notes", slug `harbor-notes`, scope `@harbor`, bundle id `com.harbornotes.app` (fictional).

## Exact functional proof performed (executed)

`pnpm prove:init --full --keep`: copied the repo to a temp dir, ran init, then in the generated app:
`pnpm install --frozen-lockfile` against the rewritten lockfile (passed), `pnpm lint`, `pnpm typecheck`, `pnpm test:run` (shared 39, validation 18, mobile 7, web 108 passed), `pnpm build` (routes: `/`, `/api/[...path]`, `/api/v1/status`, `/dashboard`, sign-in/up; no proof routes), `drizzle-kit generate` from a throwaway table (offline, produced a fresh `0000_*`), then removed it and re-ran web tests with empty migrations (108 passed). `pnpm check:boilerplate --dir=<generated app>` reported clean. A dry run and a second-run refusal were also covered by `pnpm test:boilerplate`.

## Test Value Review for new tests

| Test | What / risk protected | Level / why | Existing coverage | Priority |
| --- | --- | --- | --- | --- |
| `verifyMigrationState` (1 test, replaces the proof-table verify test) | verify must fail on pending or unknown migrations and pass on an empty journal; a wrong pass means a missed unapplied migration | unit, pure function | none | High |
| `scripts/boilerplate/boilerplate.test.mjs` (5 small tests) | init producing a clean generic app, the detector firing on the template (negative control) and on a leaked credential-shaped URL after init, identity validation, doc region stripping. Silent init/manifest drift would ship Signal One identity or proof code into every new app | node:test over a temp copy; the only layer that exercises the real scripts | none | High |

Intentionally NOT automated: install/build of a generated app on every CI run (network + minutes; covered by manual `pnpm prove:init --full`), E2E for the boilerplate, per-file assertions of the rewritten content beyond key identity points. No unrelated tests were added or removed except the replaced proof-table verify test (it asserted a Signal One-specific table and could not be generic).

## Validation results (executed)

`pnpm validate` on the branch passed: lint, typecheck, unit tests (shared 39, validation 24, mobile 10, web 124), `test:boilerplate` 5/5, `next build`. Not run: integration, Playwright (need dev Neon/Clerk secrets; unchanged by this work).

## Simulated / not executed

* No Neon, Clerk, Vercel, EAS, GitHub, Apple, or Google resource was created or contacted; no database was touched; Signal One STAGE/PROD untouched.
* Generated-app `db:migrate` against a database was not run (no database); migration status/verify logic is unit-tested only.
* Mobile Metro export / device run of the generated app was not executed; mobile identity is proven by lint, typecheck, and unit tests only.
* Generated-app CI was not run on GitHub; the same `pnpm validate` commands were run locally.

## External / manual setup boundaries

All in `docs/new-app-setup.md`: Clerk application and keys (web; mobile SDK not yet added), Neon project with `dev|qa|stage|prod` branches and per-branch roles, Vercel project settings and per-scope variables, GitHub secrets (`NEON_DEV_DATABASE_URL`, Claude token) and branch protection, Expo/EAS project, Apple/Google accounts and signing, production migration procedure (human, reviewed).

## Unresolved concerns / remaining gaps

* The issue names `docs/boilerplate-gaps.md` and `docs/boilerplate-references.md`; the repository has `docs/boilerplate-gap-report.md` and `docs/boilerplate-references-report.md`. I read those and treated them as historical template-only reports (their open items, e.g. production migration procedure, rate limiting, security headers, real logging, mobile Clerk token, are still open).
* `docs/deployment.md` section 7 still says the validation workflow is "planned" though `ci.yml` exists (pre-existing staleness, not changed).
* CI runs only `pnpm validate`; integration, acceptance-against-DB, and Playwright jobs need provisioned secrets and a human workflow edit.
* Stage hosting model is still undecided; production migrations are not automated.
* Init uses textual substitution; new Signal One content containing other spellings of the name would be caught by the detector (`signal one|signal_one|signal-one|signalone`) but not renamed beyond the four forms handled.
* The detector is intentionally noisy on the template itself (it is meant for generated apps); it is clean on the generated example.

## Next steps

1. Human review and merge of this PR.
2. Create the real new application repository from a copy and run `pnpm init:app`, then follow `docs/new-app-setup.md`.
3. Optionally add a GitHub Actions job for integration/Playwright once dev secrets exist, and refresh `docs/deployment.md` section 7.
