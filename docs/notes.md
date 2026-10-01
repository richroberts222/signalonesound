# Notes: Issue 47 "Build and Prove Reusable API Foundation"

1. Issue: #47 "Build and Prove Reusable API Foundation"
2. PR: none yet at time of writing (open one from this branch).
3. Canonical branch: `claude/issue-47-20261001-1847`, base `main`. Not merged.
4. Latest commit: the commit containing this file; see `git log -1` on the branch.

## 5. Work completed

- `apps/web/lib/api/handler.ts`: framework-free HTTP adapter `createApiRoute({ getUserId, onUnexpected })`. Lifecycle: authenticate, parse and validate (body JSON or query, size-capped), call service through `runService`, serialize the shared `Result` envelope with mapped HTTP status, `Cache-Control: no-store`, and `X-API-Version`.
- `apps/web/lib/api/route.ts`: `server-only` production wiring to Clerk `getUserId`.
- `GET /api/v1/status`: generic public endpoint (`{ status, version }`).
- `app/api/[...path]/route.ts`: unknown paths/versions under `/api` return the standard `not_found` envelope.
- `apps/web` now depends on `@signalone/validation` and `zod` (workspace/lockfile updated); `transpilePackages` includes `@signalone/validation`.
- Docs: wrote `docs/api.md` (was empty); updated `docs/services.md` and `docs/security.md` pointers.

## 6. Files changed

`apps/web/lib/api/{handler,route,api.test}.ts`, `apps/web/app/api/v1/status/route.ts`, `apps/web/app/api/[...path]/route.ts`, `apps/web/app/api/routes.test.ts`, `apps/web/package.json`, `apps/web/next.config.ts`, `pnpm-lock.yaml`, `docs/api.md`, `docs/services.md`, `docs/security.md`, `docs/notes.md`.

## 7. Architectural decisions

- Reused `runService`/`toAppError`, `Result`/`AppError`, `parseInput`, `CURRENT_API_VERSION`; no competing abstractions.
- Authentication runs before validation; authorization stays in services (adapter only maps `ForbiddenError`).
- `/api/v1/` folder versioning, additive-only within a version; new `/api/v2` for breaking changes.
- HTTP statuses map from `ErrorCode` (`STATUS_BY_CODE`); clients switch on `error.code`.
- The adapter takes `getUserId` as a dependency so it is testable and Clerk/Next-free; Clerk wiring is isolated in `route.ts`.
- No database schema change, no domain roles/permissions, no domain endpoints.

## 8. Functional proof performed

Tests drive real `Request` objects through the adapter into a generic test-only service (no domain entity) and assert on real `Response` objects, plus the real `status` and fallback route modules with Clerk mocked. No live HTTP server and no database were used.

## 9. Test/lint/typecheck/build results

Commands run through `corepack pnpm` (`pnpm` is not on PATH):

- `apps/web` tests: 9 files, 103 passed (32 new tests across `api.test.ts` and `routes.test.ts` are included; the figure was taken before the final full-repo run below).
- `pnpm -r --if-present typecheck`: clean.
- `pnpm -r --if-present lint`: clean.
- `next build` in `apps/web`: succeeded; routes `/api/[...path]` and `/api/v1/status` listed.

## 10. Not tested, and why

- Live HTTP against `next start`: started it, but `curl` was not permitted in this environment, so it was stopped.
- Real Clerk authentication (session or mobile bearer token): needs real keys; Clerk is mocked in tests.
- Root `pnpm validate` as one command (nested `pnpm` not on PATH).
- Database access: the proof does not touch a database; no DEV/STAGE/PROD data was modified.

## 11. Unresolved concerns

- Mobile bearer-token verification through `auth()` is expected but not proven end to end.
- `onUnexpected` is a no-op until a logging foundation exists, so unexpected errors are currently not recorded anywhere.
- No rate limiting, CORS, or request IDs.
- Route files use relative imports because Vitest has no `@/` alias.

## 12. Recommended next steps

1. Open the PR and review.
2. Add a logging foundation and wire it to `onUnexpected`.
3. Verify mobile bearer-token auth against a real Clerk dev instance.
4. Add the first real domain endpoint only under its own issue.
