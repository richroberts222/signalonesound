# Notes: Issue 25 "Build Reusable Testing Foundation"

1. Issue: #25 "Build Reusable Testing Foundation"
2. PR: #31 (open). Not merged; the human is the merge gate.
3. Canonical branch: `claude/issue-25-20261001-0632`, base `main`. Conflict with `main` resolved by the human (merge commit `ff76131`).
4. Latest commit: the commit containing this file; see `git log -1` on the branch.

## 5. Work completed

- Vitest configs for `packages/shared`, `packages/validation` (new vitest devDependency + lockfile update), `apps/web` (`vitest.config.mts`).
- Test-only helpers `@signalone/shared/testing` (not in package index): `setup.ts` (clears APP_ENV/DATABASE_ENV/DATABASE_URL/Clerk/VERCEL_ENV before each test, unstubs env after), `fakeServerEnv`, `clearIsolatedEnv`, with self-tests.
- New behavior tests: shared `utils`, validation `common` schemas.
- Root scripts: `test`, `test:run`, `test:watch`, `validate`; `test:watch` added to each workspace.
- `docs/testing.md` rewritten with permanent architecture; `docs/environment.md` Testing section updated.
- Existing env and boundary tests preserved.

## 6. Files changed

`package.json`, `pnpm-lock.yaml`, `apps/web/package.json`, `apps/web/vitest.config.mts`, `packages/shared/package.json`, `packages/shared/vitest.config.ts`, `packages/shared/src/testing/{index,setup,testing.test}.ts`, `packages/shared/src/utils.test.ts`, `packages/validation/package.json`, `packages/validation/vitest.config.ts`, `packages/validation/src/common.test.ts`, `docs/testing.md`, `docs/environment.md`, `docs/notes.md`.

## 7. Architecture decisions

- Vitest only; no new tooling. Helpers live in a test-only subpath of `@signalone/shared` rather than a new package; web/validation reference its setup file by relative path.
- Setup file strips credentials/environment identity so unit tests cannot reach Neon; guards in `env.ts` untouched.
- Component/E2E/API/DB/mobile test tooling intentionally not added; documented in `docs/testing.md`.

## 8. CI workflow: NOT PRESENT (human action required)

`.github/workflows/ci.yml` is **not on this branch**. The Claude GitHub App cannot create or modify files under `.github/workflows/`, so it was not attempted (no workarounds). Earlier versions of this file wrongly listed it as completed; it was never committed. The human must add it manually. Its intended jobs: secret-free `validate` (frozen install, lint, typecheck, test:run, build), and optionally an actionlint job. A suggested definition is in the PR comment. The workflow is unvalidated and has never run on GitHub.

## 9. Functional verification performed

Run in the sandbox on the current branch head after `corepack pnpm install --frozen-lockfile` (the `corepack pnpm -r --if-present <script>` form, which is what the root scripts execute):

- test: shared 31 passed (3 files), validation 8 passed (1 file), web 17 passed (2 files); all pass.
- typecheck: shared, validation, web all Done.
- lint: eslint completed with no errors reported.
- build: `pnpm --filter web build` succeeded with no env/secrets configured.
- Vercel preview deployment for the PR reported Ready.

## 10. Not tested, and why

- `ci.yml` does not exist, so nothing CI-related was validated.
- Root scripts `pnpm test:run`, `pnpm test:watch`, `pnpm validate` were not invoked directly (the `corepack pnpm` equivalents were).
- Hostile-shell check (tests with `DATABASE_URL`/`APP_ENV=prod` exported) was not run; isolation is covered by the setup self-tests only.

## 11. Unresolved concerns

- No CI runs the validation commands until the human adds `ci.yml`.
- Component/E2E/API/DB/mobile tooling remains undecided.

## 12. Recommended next steps

1. Human adds `.github/workflows/ci.yml` and confirms it runs green.
2. Review; human merges.
3. Later issues: database integration tests (separate `test:integration`, qa-only), component tests, mobile tests per `docs/testing.md`.
