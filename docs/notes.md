# Notes: Issue 49 "Build and Prove Generic Full-Stack Vertical Slice"

1. Issue: #49 "Build and Prove Generic Full-Stack Vertical Slice"
2. PR: none yet at time of writing (open one from this branch).
3. Canonical branch: `claude/issue-49-20261001-1919`, base `main`. Not merged.
4. Latest commit: the commit containing this file; see `git log -1` on the branch.

## 5. Work completed

- Generic, disposable "proof item" feature (not a Signal One concept) through the whole stack: shared contract and client, API route, service, data access, Drizzle table, real migration, web page, mobile client and screen.
- Real migration `apps/web/drizzle/0001_proof_item.sql` (table `proof_item`, unique `(owner_id, label)`), generated with `db:generate`, applied to DEV only with `db:migrate -- --env=dev`. `drizzle-kit push` was not used.
- Shared client `createApiClient`/`createProofItemClient` (`packages/validation`), used by Web and Mobile; validates responses against the contract and never throws.
- Foundation fixes: `createApiRoute` now also reports failures that escape the normal path to `onUnexpected`; `apiRoute` is wired to a new `reportUnexpectedError` hook (error class and DB operation/kind only); composition root `lib/composition.ts` added.
- Test infrastructure: acceptance suite (AC1 to AC9), `test:integration` (real DEV database), Playwright foundation (`test:e2e`) with first E2E journey.
- Docs updated: `api.md`, `services.md`, `testing.md`, `mobile.md`, `automation/README.md`, `automation/playwright.md`.

## 6. Files changed

New: `packages/validation/src/{proof-item,api-client,proof-item.test}.ts`; `apps/web/db/{proof-items,proof-items.fake,proof-items.integration.test}.ts`; `apps/web/drizzle/0001_proof_item.sql` and `meta/0001_snapshot.json`; `apps/web/lib/services/{proof-items,proof-items.test}.ts`; `apps/web/lib/api/{proof-items,proof-items.acceptance-suite,proof-items.acceptance.test,report,report.test}.ts`; `apps/web/lib/composition.ts`; `apps/web/app/api/v1/proof-items/route.ts`; `apps/web/app/proof/page.tsx`; `apps/web/components/proof/proof-items-panel.tsx`; `apps/web/{playwright.config.ts,vitest.integration.config.mts}`; `apps/web/e2e/{global-setup,proof-items.spec}.ts`; `apps/mobile/src/proof/{proofClient,proofClient.test,ProofItemsScreen}`.
Modified: `packages/validation/src/index.ts`, `apps/web/{db/schema.ts,drizzle/meta/_journal.json,lib/api/handler.ts,lib/api/route.ts,app/api/routes.test.ts,proxy.ts,vitest.config.mts,package.json,.gitignore}`, `apps/mobile/{package.json,src/App.tsx}`, `pnpm-lock.yaml`, docs listed above.

## 7. Architectural decisions

- Reused the API adapter, `runService`, `authorize`/`isOwner`, `DatabaseError`/`withDbErrors`, `Result`, `parseInput`; no competing abstractions.
- Route definitions live in `lib/api/proof-items.ts` (a factory taking the route builder and service getter) so acceptance/integration tests run the exact production definitions with a faked identity.
- The shared client lives in `@signalone/validation` (no new package). It uses a minimal `FetchLike` type, so the package needs no DOM lib.
- Business rules (per-user cap, ownership, authorization) are in the service; the unique-label rule is enforced by the database and mapped by existing `toAppError` to a generic `409`.
- Deletion uses `DELETE ?id=` because the adapter has no path-parameter support (noted as a gap, not changed).
- Unexpected-error reporting: no logging system exists, so the existing `onUnexpected` hook is wired to a stopgap stderr line. No second logging system was created.
- Integration and E2E are separate commands, not in `pnpm test`/`validate`, and fail closed (dev/qa only).
- `proof_item` is intentionally removable; steps are in `docs/api.md`.

## 8. Acceptance criteria (`lib/api/proof-items.acceptance-suite.ts`)

AC1 anonymous gets 401 on every operation. AC2 invalid input is 400 with field errors and nothing persisted. AC3 create returns only `{id,label,createdAt}` (no owner leak) and is readable afterwards. AC4 users see only their own items. AC5 duplicate label is a generic 409 for the same user, allowed for another. AC6 per-user cap of 20 gives 409. AC7 owner can delete and it is gone. AC8 deleting another user's item is 403 and leaves it intact; unknown id 404; malformed id 400. AC9 unexpected failure is a generic 500, no internals, reported server-side.

## 9. Functional proof performed

- Real DEV database (Neon, `DATABASE_ENV=dev` from the runner environment): migration applied; the full acceptance suite plus repository tests ran through real service, repo, Drizzle, and database; a row created through the API was read back directly from `proof_item`; a follow-up query showed 0 leftover test rows.
- Real application runtime and real HTTP: Playwright started `next dev` and, using placeholder Clerk keys, confirmed `GET /api/v1/proof-items` answers `401` with the standard envelope and `X-API-Version: v1`, and that `/proof` redirects anonymous visitors to Clerk/sign-in. This was run with a temporary config (no Clerk testing token) and local placeholder values that are not committed.
- Mobile: Metro bundled Android and iOS with the new client and screen.

## 10. Real vs mocked dependencies

| Layer | Default `pnpm test` | `test:integration` | Playwright (as run here) |
| --- | --- | --- | --- |
| HTTP | in-process `Request`/`Response` | in-process | real (`next dev`) |
| Authentication | fake `getUserId` (Clerk mocked in route wiring test) | fake `getUserId` | real Clerk middleware, no real session |
| Service, validation, adapter | real | real | real |
| Data access, Drizzle, database | in-memory fake repo | real DEV Postgres | not reached (no signed-in session) |
| Mobile fetch | fake fetch | n/a | n/a |

## 11. DEV database proof

`db:migrate:status` before: applied 1 (`0000_migration_proof`), pending 1 (`0001_proof_item`). `db:migrate -- --env=dev`: applied `0001_proof_item`; status after: applied 2, pending 0. `db:migrate:verify` passed (it only checks `migration_proof`; `proof_item` was verified by the integration tests). STAGE and PROD were not accessed.

## 12. Test, lint, typecheck, build results (latest run)

Commands run through `corepack pnpm` (`pnpm` is not on PATH, so the root `pnpm validate`/`pnpm lint` scripts, which call nested `pnpm`, fail with exit 127; I ran their `-r --if-present` equivalents).

- Unit and acceptance (default): shared 39, validation 24, mobile 10, web 124 (12 files); all passed.
- Integration (`test:integration`, real DEV DB): 1 file, 13 tests passed.
- Playwright: 3 tests defined. With the committed config and this environment, all 3 skip (no Clerk test user/keys). With temporary placeholder keys the 2 unauthenticated tests passed (real server); the signed-in journey was not run.
- Lint: clean (web, mobile). Typecheck: clean (shared, validation, mobile, web). `next build`: succeeded, routes `/api/v1/proof-items` and `/proof` listed. `expo export`: Android and iOS bundled (output deleted).

## 13. Not tested, and why

- The signed-in browser journey (validate, create, persist across reload, duplicate, delete): needs a Clerk development instance with a test user (`CLERK_SECRET_KEY`, publishable key, `E2E_CLERK_USER_USERNAME/PASSWORD`); not available here. The spec is written and typechecks but has never executed.
- Real Clerk session or mobile bearer-token verification against the API.
- Mobile on a device/emulator and any live mobile-to-server call.
- The React UI panel has no component tests (no DOM test environment; documented in `testing.md`).
- Integration/E2E in CI: workflow files are human-owned; the secret-free `validate` job is unchanged.

## 14. Architectural gaps discovered

- No logging foundation: unexpected errors previously went nowhere. Stopgap hook added; a real logger is still undecided.
- Adapter had no path-parameter support (workaround: query `id`).
- Adapter did not report escaped (last-resort) failures: fixed.
- Services had no composition root: added `lib/composition.ts`.
- Root scripts depend on `pnpm` being on PATH; without it `pnpm validate` fails.
- `db:migrate:verify` only checks the first proof table.
- Mobile has no Clerk token source yet (`noToken` placeholder).

## 15. Unresolved concerns

- Dev-server E2E uses `next dev`; a production-build E2E may be preferable later.
- The page-protection check relies on Clerk's handshake redirect and accepts either the handshake domain or `/sign-in`.
- `DELETE` of another user's item returns `403` (reveals existence); switch to `404` if existence must be hidden.
- Proof feature is live code on `/proof` and `/api/v1/proof-items`; remove before production (steps in `docs/api.md`).

## 16. Recommended next steps

1. Open the PR; provision a Clerk dev test user and run `pnpm --filter web test:e2e` to execute the signed-in journey.
2. Add a separate CI job (human-edited workflow) for integration/E2E with dev/qa secrets.
3. Add `@clerk/expo`, then replace `noToken` and verify bearer auth against the API.
4. Choose a logging system and swap the `reportUnexpectedError` sink.
5. Remove the proof feature once real domain work begins.

## 17. Test Value Review (retrospective) and test completion report

New permanent rule: `docs/automation/test-value-review.md` (cross-referenced from `automation/README.md`, each layer doc, and `testing.md`). It is applied below to the tests added by this PR. No tests were removed or weakened; no test code changed.

| Group | Layer | Behavior protected and why it matters | Criteria | Priority |
| --- | --- | --- | --- | --- |
| Acceptance suite (`proof-items.acceptance-suite.ts`, 9 tests; in memory by default, real DEV DB in integration run) | Acceptance (API level, lowest layer that can prove the criteria) | Authentication, input validation, no owner-field leak, per-user isolation, ownership authorization, conflict/cap rules, generic 500s. Security and data-integrity regressions here are customer-trust failures. | AC1 to AC9 | Critical |
| Service tests (`services/proof-items.test.ts`, 6) | Unit | Business rules (cap boundary, ownership, lost-race delete, no delete when denied) with precise boundary cases that are cheap to pin down here. | AC4 to AC8 | High |
| Shared contract/client tests (`validation/proof-item.test.ts`, 6) | Unit | One contract used by Web and Mobile: length bounds, uuid, no database-shaped extras, client never throws and validates responses. Drift here breaks every client. | AC2, AC3 | High |
| Error-reporting tests (`api/report.test.ts`, 5) | Unit | Failures are reported server-side without message, cause, or stack (data-leak and observability guard), including the last-resort path. | AC9 | High |
| DB integration (`db/proof-items.integration.test.ts`, 4, real DEV DB, fail-closed) | Integration | What fakes cannot show: real migration/schema, the unique constraint mapped to a sanitized error, owner-scoped delete in SQL. | AC3, AC5, AC8 | High |
| E2E: signed-in journey (1) | E2E | The only test of the real browser + Clerk session + UI + API + DB together (the React panel has no component tests). | UI flow over AC2, AC3, AC5, AC7 | High; never executed yet (no Clerk test user) |
| E2E: unauthenticated (2) | E2E | Real Clerk middleware protects `/proof` and the API answers the standard 401 envelope; fakes elsewhere cannot show the middleware wiring. | AC1 | Normal |
| Mobile client tests (`proofClient.test.ts`, 3) | Unit | Mobile calls the absolute API URL with a bearer token and surfaces the standard error envelope. | AC3 | Normal |

Layer choice: business rules and authorization sit in unit/acceptance because they are fast, deterministic, and exact. Integration is reserved for the database boundary. E2E is limited to three tests that need a real browser and middleware.

Candidates for trimming (not removed; a human decision, and only worth acting on if maintenance cost bites):

- E2E "API refuses anonymous callers": largely overlaps AC1 and `routes.test.ts`. It stays because it exercises the real Clerk middleware; Low-to-Normal.
- Integration "a row created through the API exists in proof_item": overlaps the acceptance suite run against the DEV DB (AC3). It adds only an independent direct read of the table. Low; the first removal candidate.
- Mobile "sends no Authorization header (noToken)": covers a temporary placeholder and should be deleted or replaced when Clerk is added to mobile. Low.
- Partial overlap on duplicate-label (service test, AC5, DB unique test) is intentional: three different layers prove three different things (rule mapping, API result, real constraint). Kept.

Intentionally not automated: React panel component tests (no DOM environment; the E2E journey covers the flow and the logic is thin), visual/styling checks, mobile device E2E, real bearer-token verification (needs Clerk for mobile). See section 13.

Validation for this change: docs-only. See the PR comment for the commands run and results.
