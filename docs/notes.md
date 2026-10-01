# Handoff notes: Issue 53 (standalone boilerplate repository)

## Status: NOT "BOILERPLATE V1 READY"

The export and the fresh-app proof were executed and passed. The standalone repository has **not** been populated: the automation session could not run `git init`, `git ls-remote`, or any push to the existing target repository (each required approval that was not granted). So the proof ran against a local export, not the pushed repository, and the "V1 READY" claim is withheld.

## Source

* Signal One source commit used for the export: `0eae6e3144bd320f83ce785f50687889d0f9a59f` (branch `claude/issue-53-20261001-2046`).
* Standalone repository: target is the existing, empty repository `richroberts222/fullstack-boilerplate` (not contacted). The generated tree is at `/home/runner/work/fullstack-boilerplate` on the CI runner. That path is ephemeral and lost when the job ends.
* Standalone boilerplate commit: none (nothing committed or pushed).

## Commands actually executed (in the Signal One checkout unless noted)

Note: `pnpm` was not on PATH, so `corepack pnpm` was used. Nested `pnpm` calls inside scripts needed `corepack enable --install-directory node_modules/.bin` (a git-ignored directory created in the checkout). `pnpm validate` itself could not be run as one command for the same reason, so its parts were run individually.

1. `corepack pnpm install --frozen-lockfile`: passed.
2. `corepack pnpm test:boilerplate`: 6 tests, 6 pass (including the new export-then-init test).
3. `corepack pnpm -r --if-present lint`: passed.
4. `corepack pnpm -r --if-present typecheck`: passed.
5. `corepack pnpm -r --if-present test`: shared 39, validation 24, mobile 10, web 124 passed.
6. `corepack pnpm --filter web build`: passed.
7. `corepack pnpm check:boilerplate` (Signal One itself): exits 1 with 521 findings. This is expected, because Signal One is the reference app, not an initialized app.
8. `corepack pnpm export:boilerplate --out=/home/runner/work/fullstack-boilerplate`: copied 195 files, removed the proof slice, applied the neutral identity to 67 files.
9. In the export: `corepack pnpm --dir <export> install --frozen-lockfile`: passed. This resolves the open question about the lockfile after identity substitution.
10. In the export: `test:boilerplate`: 5 pass, 1 skipped (the export test is skipped in the standalone by design).
11. In the export: `check:boilerplate`: exits 1 with 225 findings (template-only paths plus the template/Signal One identifier rule). This is expected for an uninitialized template; see "Open observation".
12. `corepack pnpm exec node /home/runner/work/fullstack-boilerplate/scripts/boilerplate/prove-init.mjs --full`: **PROOF OK (full)**.

No code fixes were needed: none of the new export/init/check tooling failed.

## Fictional application used

"Harbor Notes", initialized into a temporary directory under `/tmp` by `prove-init.mjs`. No external resources were created or contacted.

## What was actually proven (from the export, via prove-init --full)

* Install from the rewritten lockfile with `--frozen-lockfile`: passed.
* Init succeeded; the new identity replaced the template identity (67 files rewritten); template-only docs and `scripts/boilerplate` removed.
* Post-init leak/configuration check: "clean". This covers absent Signal One identity, absent template identity, absent proof-item references, and absent placeholder store IDs.
* The exported tree contains no proof-item artifacts, no proof-only migrations (`apps/web/drizzle` removed), and the proof routes are absent from the build.
* In the initialized app: lint, typecheck, unit tests (shared 39, validation 18, mobile 7, web 108), and `next build` passed.
* Offline `db:generate` from the clean schema created `0000_*.sql`; web tests passed again afterwards.
* The export contains (by file listing of `docs/`, plus the proof running): `customization-map.md`, `stack.md`, `new-app-setup.md`, `automation/` docs including `test-value-review.md`, `architecture-rules.md`, `database.md`, `environment.md`, `mobile.md`, `web.md`, `api.md`, `services.md`, `shared-code.md`; init and leak-check tooling; web, mobile and shared/validation packages; DB tooling (migrate/seed/reset guards) with its tests.

## What was NOT proven

* The proof ran against a local export, not the pushed standalone repository.
* Reusable Claude workflow/rules: `.claude-pr/CLAUDE.md` and `CLAUDE.md` appear in the check output of the export, but I did not separately inspect `.claude/` contents.
* Playwright E2E, mobile builds (EAS), real Clerk/Neon/Vercel behaviour, and live-database integration tests were not run (no external resources were touched, by instruction).
* Signal One STAGE/PROD were not accessed.

## Open observation

The uninitialized export still mentions "Signal One" in many docs and comments (the leak check flags them before init; init rewrites them). A reader of the template repo before running init will see Signal One wording. If a Signal One-free template is wanted, the export should also rewrite these; this was not changed.

## Remaining human steps

1. Re-run `pnpm export:boilerplate --out=<dir>` locally from this branch (the runner's directory is gone).
2. In `<dir>`: `git init -b main`, commit, add remote `git@github.com:richroberts222/fullstack-boilerplate.git`, push.
3. In a fresh clone: `pnpm install`, `pnpm test:boilerplate`, `pnpm prove:init --full`. Only then record the standalone commit here and call it BOILERPLATE V1 READY.
