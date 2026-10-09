# Rules review 2: `docs/data-fetching.md` (30 sections) and `docs/data-mutations.md` (39 sections)

Reviewed 2026-10-09 against the code, the guard tests and the other rule documents. Verdict key as in `README.md` (added by the first review, `git-workflow.md`).

## Overall verdict

The rules are **correct**: they describe a standard layered design (client, authenticated server boundary, validation, authorization, service, data access, ORM, database) and none contradicts the code or the other rule documents. Most are **Guidance** by nature (judgment about pagination, caching, idempotency), for which no mechanism is appropriate. A small core is **Enforced**. Two real defects were found and fixed; two things need decisions that are not yet made.

## Enforced rules (a test or setting fails if they are broken)

| Rule (fetching / mutations section) | Mechanism |
| --- | --- |
| Clients never read the database or its secrets (F27 / M36, M31, F16) | `security.test.ts` (secrets only in server modules; `'use client'` files never import server, database or tooling modules); `boundary.test.ts`; mobile `boundary.test.ts` |
| Identity comes from the server, not the client (F8 / M7) | `apiRoute` takes identity from the Clerk session; `services.test.ts` "derives ownership from the context" |
| Authorization is server-side and by ownership (F9 / M8, M28) | Unit tests with fakes (`auth.test.ts`, `services.test.ts`). Not yet proven against a real database or a real token (F-TEST-002, F-AUTH-005) |
| Input validated on the server (F12 / M9) | Shared validation schemas used by the API adapter; `api.test.ts` |
| No `FormData` as the domain contract (M10) | `services.test.ts` static boundary check (services may not use `FormData`) |
| Errors do not leak internals (F16 / M20, M21) | `report.test.ts`, `db.test.ts` |
| Environment isolation; reset and seed refuse `prod` (F24 / M26, M27) | `env.test.ts`, `db/tooling/*.test.ts` |
| Tests never use production (F25 / M33) | Integration test refuses unless `DATABASE_ENV` is dev or qa and not on Vercel |

## Fixed in this pull request

| Where | Defect | Fix |
| --- | --- | --- |
| M14 Transactions | Told the reader to use database transactions without saying the `neon-http` driver has none (`db.transaction` throws). `database.md` and `services.md` say so; this document did not. A developer following only this document would write code that fails at run time. | Added the driver limit and the `db.batch` alternative, with pointers |
| M25 / F14 Dates and times | Say "preserve clear semantics" and "documented meaning", but no conventions are documented (decision pending, F-ARCH-001). | Added a gate: decide and write the conventions before the first date, time, money or unit column exists |

## Judgment rules with no mechanism (kept as Guidance, by design)

Pagination, filtering and sorting, search, N+1, selecting columns (F17 to F23); idempotency, concurrency, optimistic UI, cache invalidation, redirects (M18, M19, M22 to M24); update and delete design, soft delete versus hard delete (M15 to M17); schema evolution (M35); logging (F26 / M32); the two Claude checklists (F29, M38). They are correct as thinking prompts. Making any of them a test now would be speculative: there is no data model to test them against.

## Gaps and open items

| Item | Status | Where tracked |
| --- | --- | --- |
| Mobile bearer-token path for reads and writes (F2, F4 / M3, M5) | Designed, unproven: no real token has been carried | F-AUTH-005; the walking skeleton |
| Real-database proof of ownership scoping in the query (F9) | Only unit-level with fakes | F-TEST-002 (integration job in CI) |
| Auditability (M29), account deletion and export (M17) | No design yet | F-AUTH-004, F-AUTH-002 (launch gate) |
| API compatibility for old mobile builds (M34) | No versioning or contract test yet | F-AUTH-005 |

## Duplication (technical decision, deferred)

Both documents restate the core path, "no client database access", "avoid database leakage", authentication, authorization, environments and testing. The statements agree today, but they will drift (F-DEVOS-003). Consolidating them means moving shared rules into one owner document and linking from the others, which touches about 1,500 lines. That is a separate, larger change; it is not bundled here so this pull request stays reviewable. Recommendation: do it after the architecture-rules review, which decides the owner document for each shared rule.

## Owner decisions

None needed for these two documents. (The time-zone, money and unit conventions are decided with the first data model; the owner is asked then.)
