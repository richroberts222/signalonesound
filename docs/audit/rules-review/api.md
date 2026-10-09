# Rules review 7: `docs/api.md`

Reviewed 2026-10-09 against `lib/api/*`, `app/api/*` and their tests, using the owner's five tests (**Sense**, **Standard**, **Solid**, **Enforced**, **Proven**). Standards named from recollection (not re-fetched): OWASP API Security Top 10, RFC 9110 HTTP semantics, semantic versioning of public interfaces, 12-factor.

## Overall verdict

The rules are **sensible, standard and solid**: a thin, framework-free adapter; authenticate before parsing; one response envelope with stable error codes; additive-only versioning because mobile apps cannot be force-updated. The enforcement exists and is largely proven. Proving it found **one test that gave false assurance** (the request-size cap) and it is fixed here.

## Rule-by-rule

| Rule | Standard | Enforced | Proven |
| --- | --- | --- | --- |
| Adapter is framework-free (`handler.ts` uses only `Request` and `Response`); routes use `apiRoute` | Hexagonal / ports and adapters | `api.test.ts` drives it with fakes; `routes.test.ts` | Structure only; no mutation needed |
| Authenticate first (401) before parsing or touching services | OWASP API2 (broken authentication) | `api.test.ts` "returns 401 when unauthenticated, without validating or calling the service" | **Yes** (prior ledger: removing the check fails 4 tests; ignoring the `required` option fails 13) |
| Parse and validate input with the shared schema; 400 with field errors | OWASP API3/API6 (property-level validation), A03 | `api.test.ts` | Yes by the same suites |
| Body is size-capped; malformed and empty bodies are rejected | OWASP API4 (unrestricted resource consumption) | `api.test.ts` | **Was not proven.** Deleting the size check left all 54 tests passing, because the existing test's oversized `label` failed schema validation for another reason. **Fixed**: new test uses a valid body padded with whitespace to the cap. Now proven: removing the check fails it; shifting the cap by one fails it |
| One response envelope; stable `error.code`; `Cache-Control: no-store`; `X-API-Version` | REST conventions; RFC 9110 | `api.test.ts` (success headers) | **Yes**: removing `no-store` fails 1 test |
| Unexpected errors return only "Something went wrong"; never stack, SQL or secrets; reported server-side only | OWASP API8 (security misconfiguration) and A09 | `report.test.ts`, `api.test.ts`, service `run` tests | **Yes**: changing the internal-error text in `runService` fails 5 tests |
| Status mapping per code (400, 401, 403, 404, 409, 500) | RFC 9110 | `STATUS_BY_CODE` tests | By the suites above |
| 403 and 404: not-found preferred when existence must not be revealed | OWASP API1 | Service-level choice; acceptance suite checks 403, 404 and malformed id | Partly (unit-level) |
| Versioning: `/api/v1`, additive-only inside a version, clients ignore unknown fields, unknown paths give the standard 404 | Semantic versioning of interfaces | Catch-all route test; no contract-compatibility test | **Not proven**: nothing fails if a field is removed or renamed. Contract tests are planned (F-AUTH-005) |
| Identity only from Clerk; never from body, query or headers | OWASP API1 | `auth.test.ts`, `apiRoute` | Yes (prior ledger) |
| `proxy.ts` does not protect API routes; every route declares `auth` and fails closed | Defense in depth, deny by default | `apiRoute` requires an explicit `auth` option (type) | Yes by the 13-test break |
| Add endpoints through `apiRoute` with a fake `getUserId` and fake service | Process | `api.test.ts` pattern | n/a |

## Fixed in this pull request

* `api.test.ts`: new test that pins the request-size cap (at the cap succeeds, one over fails with "too large"), replacing reliance on a test that passed for the wrong reason.

## Not decided yet (documented in `api.md`, tracked here)

| Item | Where tracked |
| --- | --- |
| Rate limiting (`rate_limited` code is reserved) | F-SEC-006 (Vercel Firewall first) |
| Contract-compatibility tests for old mobile builds | F-AUTH-005 |
| Mobile bearer token verified end to end | F-AUTH-005, walking skeleton |
| CORS, request IDs and real logging, idempotency keys, pagination beyond `Paginated<T>`, OpenAPI | Decide when the first endpoint needs them |

## Owner decisions

None for this document.
