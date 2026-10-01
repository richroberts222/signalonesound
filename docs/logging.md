# Logging and Error Handling

Small, replaceable foundation. No external logging provider is used.

## Error model (`@signalone/shared`, runtime-agnostic)

* `ErrorCode` / `AppError` / `Result` (`result.ts`): the transport-neutral shape sent to clients.
* `AppException` (`errors.ts`): thrown inside server code. Carries `code`, `publicMessage` (safe), optional `fieldErrors` (safe), and server-only `context` and `cause`.
* Expected vs unexpected: an `AppException` with any code except `internal` is **expected** (validation, auth, not found, conflict, rate limit). Everything else (`internal` exceptions, plain `Error`, non-Error throws) is **unexpected**.
* `toAppError(error)`: the only conversion to a client-facing value. Expected errors yield `{ code, message, fieldErrors? }`; unexpected errors yield `internal` with `GENERIC_ERROR_MESSAGE`. Messages, stacks, `context`, and `cause` are never included.
* `classifyError`, `isExpectedError`, `isAppException`: classification helpers.
* Never put secrets or internals in `publicMessage`; put diagnostics in `context`/`cause`.

## Redaction (`@signalone/shared`, `redact.ts`)

`redact()` returns a deep, JSON-safe copy with sensitive keys (password, secret, token, authorization, cookie, api key, database url, session, jwt, ...) replaced by `[REDACTED]`, and secret-shaped values (credentialed URLs, `sk_live_`/`sk_test_` keys, bearer tokens, JWTs) scrubbed from strings under any key. Errors are serialized (name, message, stack, cause); cycles and depth are bounded. It is a safety net: still avoid logging credentials or whole request payloads.

## Logger (`apps/web/lib/logger`, server-only)

* `import { logger, reportError } from "@/lib/logger"` (the entry point imports `server-only`; client imports fail the build).
* Levels: `debug`, `info`, `warn`, `error`. Default level: `debug` in development, `info` in production, `warn` in tests.
* Entries are `{ level, time, message, context }`; context is always redacted.
* Output: one JSON line per entry in production; readable text in development.
* `logger.child({ requestId })` adds bindings to every entry.
* Replacement point: `createLogger({ sink })` (`create-logger.ts`). To add an observability provider, supply a different `LogSink`; callers do not change. `create-logger.ts` is deliberately free of `server-only` so it can be unit tested; app code imports from `@/lib/logger`.
* `reportError(logger, error, context)`: logs expected errors at `warn` (no stack) and unexpected errors at `error` (full redacted error and cause), and returns the client-safe `AppError`. Use at API route and Server Action boundaries.

## Rules

* Log server-side only; never log secrets, tokens, connection strings, or full payloads.
* Throw `AppException` for expected failures; let unexpected errors propagate to a boundary that calls `reportError`.
* Never return raw `Error` messages or stacks to clients.

## Tests

`packages/shared/src/errors.test.ts` (classification, safe output, redaction) and `apps/web/lib/logger/logger.test.ts` (levels, redaction, `reportError`, server-only boundary).

## Future integration points (not implemented here)

* API route / Server Action wrappers (API foundation issue) should call `reportError`.
* Database helpers should wrap driver errors in `AppException` with the original as `cause`.
* Request IDs, audit logging, and an external log sink are undecided.
