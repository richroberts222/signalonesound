# Notes: Issue 37 "Complete Reusable Shared Contracts Foundation"

1. Issue: #37 "Complete Reusable Shared Contracts Foundation"
2. PR: none yet at time of writing (open one from this branch; further @claude requests should come from that PR).
3. Canonical branch: `claude/issue-37-20261001-1232`, base `main` (`6ed0608`). Not merged.
4. Latest commit: the commit containing this file; see `git log -1` on the branch.

## 5. Work completed

- `@signalone/shared`: new `contracts.ts` with `ApiError` (alias of `AppError`), `Paginated<T>`, `paginated()`, `API_VERSIONS`/`ApiVersion`/`CURRENT_API_VERSION`. Exported from the barrel. No new dependencies.
- `@signalone/validation`: new `contracts.ts` with `idSchema`, `apiErrorSchema`, `resultSchema(data)`, `paginatedSchema(item)`, `parseInput(schema, input)` (returns `Result`, `validation_failed` + path-keyed `fieldErrors`, never echoes input). Exported from the barrel.
- Tests: `packages/shared/src/contracts.test.ts` (3 tests), `packages/validation/src/contracts.test.ts` (13 tests, including JSON round-trip of `Result`, schema/`Paginated` type assignability, and non-echo of submitted values).
- `docs/shared-code.md`: new "Contract conventions" section (transport / domain / database / UI model boundaries, building blocks, naming, schema-first, identifiers, errors, pagination, additive-only versioning, serialization, portability).

## 6. Files changed

`packages/shared/src/{contracts.ts,contracts.test.ts,index.ts}`, `packages/validation/src/{contracts.ts,contracts.test.ts,index.ts}`, `docs/shared-code.md`, `docs/notes.md`.

## 7. Architectural decisions

- The issue mentions existing `ApiError` and `Paginated`; they did not exist (only `Result`/`AppError`). `ApiError` is an alias of `AppError` so a failed `Result` is sent as-is; `Paginated<T>` is cursor-based, matching existing `paginationSchema`.
- Pure envelope types stay in `shared` (no zod dependency); runtime schemas stay in `validation`. Dependency direction unchanged.
- API versioning is documented as additive-only per version with `v1` as the only version; routing/HTTP mapping is deliberately left to the API foundation (`docs/api.md` is empty).
- Contract documentation was added to `docs/shared-code.md`, not `docs/api.md`, to avoid pre-empting the API foundation.
- No domain entities, API routes, DB, mobile, root, or package.json changes.

## 8. Functional verification performed

Unit tests for the new schemas/helpers (see 9). Both packages import only each other and `zod`; no server-only or infrastructure imports.

## 9. Test/lint/typecheck/build results (latest run)

Root `pnpm` scripts (`pnpm validate`) fail in this sandbox with `pnpm: not found` (scripts shell out to `pnpm`; only `corepack pnpm` is available), so package-level equivalents were run after `corepack pnpm install --frozen-lockfile`:

- `packages/validation`: `npx vitest run` 2 files, 18 tests passed; `npx tsc --noEmit` clean.
- `packages/shared`: `npx vitest run` 4 files, 34 tests passed; `npx tsc --noEmit` clean.
- `apps/web`: `npx eslint` clean; `npx next typegen && npx tsc --noEmit` clean; `npx next build` succeeded (5 routes).
- `apps/web`: `npx vitest run` **2 failed, 41 passed (4 files)**. Both failures are in `lib/security.test.ts` and are caused by `packages/shared/src/testing/index.ts` (a file this branch did not modify; it contains `process.env` access and a fake `postgresql://test:fake-password@...` URL that the repo's static security scan flags). I did not run the suite on a clean `main` checkout to confirm, but the file is untouched here and the offending lines are in it.

## 10. Not tested, and why

- Root `pnpm validate` as a single command (pnpm not on PATH).
- Mobile (`apps/mobile` has no scaffold/scripts); consumption of the contracts from React Native/Expo was not exercised.
- Web consumption: `next.config.ts` `transpilePackages` was not changed and no web code imports the new exports yet.

## 11. Unresolved concerns

- The 2 `lib/security.test.ts` failures above need a fix (allow-list or relocate the testing helper) by whoever owns `packages/shared/src/testing`; out of scope here.
- `ERROR_CODES` is part of the contract; clients must tolerate unknown codes (documented, not enforced by a test).
- No HTTP status mapping or version routing yet.

## 12. Recommended next steps

1. Resolve the pre-existing security-test failures.
2. Open the PR from this branch and review.
3. Build the API foundation on `Result`/`resultSchema`/`parseInput`/`Paginated`.
