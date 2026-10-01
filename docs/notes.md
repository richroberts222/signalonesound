# Notes: Issue 25 "Build Reusable Testing Foundation"

1. Issue: #25 "Build Reusable Testing Foundation"
2. PR: none yet at time of writing (open one from this branch; further @claude requests should come from that PR).
3. Canonical branch: `claude/issue-25-20261001-0632`, base `main`. Not merged. Independent of the Database Helpers and Logging/Error Handling branches.
4. Latest commit: the commit containing this file; see `git log -1` on the branch.

## 5. Work completed

- Vitest configs for `packages/shared`, `packages/validation` (new vitest devDependency + lockfile update), `apps/web` (`vitest.config.mts`).
- Test-only helpers `@signalone/shared/testing` (not in package index): `setup.ts` (clears APP_ENV/DATABASE_ENV/DATABASE_URL/Clerk/VERCEL_ENV before each test, unstubs env after), `fakeServerEnv`, `clearIsolatedEnv`, with self-tests.
- New behavior tests: shared `utils`/`result`, validation `common` schemas (`toFieldErrors`, pagination boundaries, email/uuid).
- Root scripts: `test`, `test:run`, `test:watch`, `validate`; `test:watch` added to each workspace.
- `.github/workflows/ci.yml`: secret-free `validate` job (install frozen, lint, typecheck, test:run, build) and `workflow-lint` job (pinned actionlint). `claude.yml` untouched.
- `docs/testing.md` rewritten with permanent architecture; `docs/environment.md` Testing section updated.
- Existing env and boundary tests preserved unchanged.

## 6. Files changed

`.github/workflows/ci.yml` (new), `package.json`, `pnpm-lock.yaml`, `apps/web/package.json`, `apps/web/vitest.config.mts`, `packages/shared/package.json`, `packages/shared/vitest.config.ts`, `packages/shared/src/testing/{index,setup,testing.test}.ts`, `packages/shared/src/utils.test.ts`, `packages/validation/package.json`, `packages/validation/vitest.config.ts`, `packages/validation/src/common.test.ts`, `docs/testing.md`, `docs/environment.md`, `docs/notes.md`.

## 7. Architecture decisions

- Vitest only; no new tooling. Helpers live in a test-only subpath of `@signalone/shared` rather than a new package (simplicity); web/validation reference its setup file by relative path.
- Setup file strips credentials/environment identity so unit tests cannot reach Neon; guards in `env.ts` untouched.
- Separate secret-free CI workflow; actionlint via pinned download in CI rather than a repo dependency.
- Component/E2E/API/DB/mobile test tooling intentionally not added; documented in `docs/testing.md`.

## 8. Functional verification performed

Ran in the sandbox on this branch (root `pnpm` scripts could not be invoked as `pnpm test:run` because nested `pnpm` is not on PATH in this sandbox; the equivalent `corepack pnpm -r --if-present <script>` was used, which is what the root scripts execute):

- `corepack pnpm -r --if-present test`
- `corepack pnpm -r --if-present lint`
- `corepack pnpm -r --if-present typecheck`
- `corepack pnpm --filter web build`

## 9. Results (latest run)

- test: shared 31 passed (3 files), validation 8 passed (1 file), web 4 passed (1 file); all pass.
- lint: `eslint` in web completed with no output (no errors).
- typecheck: shared, validation, web all Done (an earlier run failed on `process` typings in shared test helpers; fixed).
- build: `next build` succeeded with no env/secrets configured.

## 10. Not tested, and why

- `ci.yml` has NOT run on GitHub and its YAML was not machine-validated locally (YAML parser and actionlint were not permitted/available in the sandbox). The App also cannot edit workflow files, so the push of `ci.yml` may be rejected; if so the human must add it from this file's content in the PR/branch.
- Root scripts `pnpm test:run`, `pnpm test:watch`, `pnpm validate` were not executed directly (PATH issue above).
- Hostile-shell check (running tests with `DATABASE_URL`/`APP_ENV=prod` exported) was not permitted; isolation is covered by the setup self-tests only.
- `build` was run for web only (the root `build` script is `pnpm --filter web build`).

## 11. Unresolved concerns

- Web builds also depend on the Vercel/Clerk build; CI build is secret-free and passes locally, but GitHub behavior is unconfirmed.
- Component/E2E/API/DB/mobile tooling remains undecided.

## 12. Recommended next steps

1. Open the PR; confirm the `CI` workflow runs green on GitHub (and add `ci.yml` manually if absent).
2. Review; human merges.
3. Later issues: database integration tests (separate `test:integration`, qa-only), component tests, mobile tests per `docs/testing.md`.
