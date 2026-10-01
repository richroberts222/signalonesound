# Notes: Issue 24 "Build Logging and Error Handling Foundation"

1. Issue: #24 "Build Logging and Error Handling Foundation"
2. PR: none yet (open one from this branch; further @claude requests should come from the PR).
3. Canonical branch: `claude/issue-24-20261001-0630`, base `main` (`5a0b76a`). Not merged.
4. Latest commit: the commit containing this file; see `git log -1`.

## 5. Work completed

- `AppException` error model with stable codes (reuses existing `ErrorCode`), safe `publicMessage`, server-only `context` and `cause`, expected (non-`internal`) vs unexpected classification, and `toAppError()` as the only client-safe conversion.
- `redact()` deep redaction of sensitive keys and secret-shaped values; handles errors, cycles, depth.
- Server-only structured logger with levels, child bindings, JSON in production, readable in development, replaceable `LogSink`.
- `reportError()` boundary helper (logs, returns safe `AppError`).
- Tests and permanent docs (`docs/logging.md`).

## 6. Files changed

New: `packages/shared/src/errors.ts`, `errors.test.ts`, `redact.ts`; `apps/web/lib/logger/{create-logger,report-error,index,logger.test}.ts`; `docs/logging.md`.
Edited: `packages/shared/src/index.ts`, `docs/shared-code.md`, `docs/security.md`, `docs/notes.md`.

## 7. Architecture decisions

- Error/redaction are pure and live in `@signalone/shared` (usable by all clients); the logger is web-server-only (`server-only`), since no client should log server-side.
- Reused existing `ErrorCode`/`AppError`; `internal` is the only unexpected code.
- No new dependencies, no external provider, no env variables added (level derives from `NODE_ENV`).
- `create-logger.ts` is intentionally not `server-only` for testability; the app entry `index.ts` is.

## 8. Functional verification performed

Unit tests exercise classification, safe output (secrets in message/cause/context do not reach `toAppError` output), redaction of keys/values/cycles, log level filtering, child bindings, `reportError` for expected/unexpected errors, and static server-only boundary checks. The logger was not exercised from a running route (no consumers exist yet).

## 9. Test/lint/typecheck/build results (latest run)

Run per package because `pnpm -r` could not find `pnpm` on PATH in the sandbox (via `corepack pnpm --filter ...`):

- `@signalone/shared` test: 2 files, 30 tests passed.
- `web` test: 2 files, 10 tests passed.
- `web` lint (eslint): no output, exit success.
- `web` typecheck (`next typegen && tsc --noEmit`): passed.
- `@signalone/shared` typecheck: passed.
- `web` build (`next build`): compiled successfully.
- `@signalone/validation` typecheck was not run separately (unchanged).

## 10. Not tested, and why

- Root-level `pnpm test/lint/typecheck/build` aggregate scripts (pnpm not on PATH in sandbox); per-package equivalents were run instead.
- `consoleSink` console output not asserted.
- No production systems or data accessed.

## 11. Unresolved concerns

- Redaction is heuristic (key-name and pattern based); it can miss novel secret shapes and may over-redact keys such as `session`.
- Stack traces are logged in production for unexpected errors (server-side only, redacted).
- Request IDs, audit logging, and an external sink are undecided.

## 12. Recommended next steps

1. Open the PR and review.
2. API foundation should wrap handlers/Server Actions with `reportError`.
3. Database helpers should wrap driver errors in `AppException` with `cause`.
