# Testing

## Status

Vitest is installed in `packages/shared` only (`pnpm test`), covering environment validation (`/docs/environment.md`). The runner choice for the web app, mobile, and integration tests is still open (see `/docs/boilerplate-gap-report.md`); for now the required validation is lint, typecheck, build, and `pnpm test`. This document sets expectations so the choice and later tests are consistent. It does not mandate a specific tool.

## Required validation for every change

```text
pnpm lint
pnpm typecheck
pnpm build
```

Report results in the pull request. If a check fails, say so; do not claim success.

## Expectations by layer

| Layer | Expectation |
| --- | --- |
| Shared packages | Unit tests for pure functions and Zod schemas (valid, invalid, and boundary inputs). No mocks needed. |
| Business/service layer | Unit tests with data-access helpers faked; cover authorization failures and validation failures, not just success. |
| Data access | Integration tests against a non-production Neon branch (`qa`), never `prod`. |
| API / Server Actions | Tests for unauthenticated, unauthorized, invalid-input, and success paths. |
| Web UI | Component tests for behavior; end-to-end tests for critical flows (sign-in, protected routes). |
| Mobile | Added when Expo is scaffolded; must exercise the same API contracts as Web. |

## Rules

* Tests must never read or write `prod`, and must not require real secrets in source control.
* Authentication in tests uses Clerk development/test instances or a faked auth boundary, never production users.
* Database tests start from a known state via the reset/seed process in `/docs/database.md` section 12, which must not destroy migration history.
* Tests are deterministic: no reliance on wall-clock time, randomness, or test order unless controlled.
* Every bug fix adds a regression test where practical.
* Tests live next to the code they cover or in a `tests` directory of the owning app/package, named `*.test.ts(x)`.
* CI must run the same commands as local validation.
