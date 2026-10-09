# API

The HTTP API is the boundary Web and Mobile (and any future client) use to reach Signal One. It is a thin adapter over the service layer (`/docs/services.md`); it is not a business-logic layer. No Signal One domain endpoints exist yet.

```text
Web / Mobile
  -> API boundary: app/api/v1/**/route.ts            (apiRoute(...) from lib/api/route.ts)
  -> authentication                                   getUserId() via Clerk (session cookie or bearer token)
  -> input validation                                 Zod schema from @signalone/validation
  -> service function (authorization inside)          lib/services, authorize()
  -> data-access helper -> Drizzle -> Neon/PostgreSQL
```

## Modules (`apps/web/lib/api/`)

* `handler.ts`: framework-free adapter. `createApiRoute({ getUserId, onUnexpected })` returns a route factory; `toResponse(result)`; `STATUS_BY_CODE`; `API_VERSION_HEADER`; `MAX_BODY_BYTES`. Uses only the standard `Request`/`Response`; must not import Next.js, Clerk, `server-only`, or the database (tested).
* `route.ts`: `server-only` production wiring: `apiRoute = createApiRoute({ getUserId })`. Route files import `apiRoute` from here.

## Request lifecycle

1. Authenticate (`auth: "required"`): `getUserId()` must return a trusted Clerk user ID, else `401`. Public routes (`auth: "public"`) receive a `null` context. Authentication runs before parsing, so unauthenticated callers learn nothing about the input contract.
2. Parse and validate (`input: { schema, source }`): `body` is JSON (size-capped, malformed/empty rejected), `query` is the URL search params (repeated keys: last wins). Validation uses `parseInput` and fails with `400 validation_failed` and path-keyed `fieldErrors`, before any service code runs. Messages never echo submitted values.
3. Call the service: the route's `handle(ctx, input)` calls one service function with a `ServiceContext` and validated input. Authorization (`authorize()`), ownership, state rules, and not-found/conflict decisions live in the service. Handlers must not contain business rules or query the database.
4. Serialize: failures thrown by the service (or anything above) are mapped by `runService` to the shared `Result`/`AppError`, then to an HTTP status.

## Response and error contract

Every `/api` response is the shared `Result<T>` envelope as JSON (`@signalone/shared`; schema helpers in `@signalone/validation`), with `Cache-Control: no-store` and `X-API-Version`.

```text
200 { "ok": true,  "data": <T> }
4xx/5xx { "ok": false, "error": { "code": ErrorCode, "message": string, "fieldErrors"?: { [path]: string[] } } }
```

| `error.code` | HTTP | Meaning |
| --- | --- | --- |
| `validation_failed` | 400 | Input invalid (`fieldErrors` when field-level) |
| `unauthenticated` | 401 | No trusted identity |
| `forbidden` | 403 | Authenticated, not permitted |
| `not_found` | 404 | Missing (also preferred when existence must not be revealed) |
| `conflict` | 409 | State conflict, including database unique violations (generic message) |
| `rate_limited` | 429 | Reserved; rate limiting is not implemented |
| `internal` | 500 | Unexpected; always `"Something went wrong"` |

Clients switch on `error.code`, not on message text or only on the status. Unexpected errors (including a failing identity provider) never expose stack traces, SQL, driver text, or secrets; the original error goes only to the `onUnexpected` hook (wired to `reportUnexpectedError`, see below). Do not return database row types; services map rows to stable output types (`/docs/services.md`).

## Versioning

* Public endpoints live under `/api/v1/...` (the folder `app/api/v1/`). `API_VERSIONS` / `CURRENT_API_VERSION` in `@signalone/shared` are the source of truth; responses carry `X-API-Version`.
* Within a version, changes are additive only (new endpoints, new optional request fields, new response fields). Mobile apps cannot be force-updated, so removing or renaming fields, changing meaning, or tightening validation requires a new `/api/v2` that runs alongside `v1` until clients migrate.
* Clients ignore unknown response fields. Unknown paths or versions under `/api` return the standard `404 not_found` envelope (`app/api/[...path]/route.ts`).
* No negotiation headers, date versions, or per-endpoint versions.

## Authentication and authorization boundary

* Identity comes only from Clerk's verified request context via `getUserId()` (`lib/auth/server.ts`); never from the body, query, or headers a client chooses. Web uses the session cookie; mobile sends a Clerk bearer token, handled by the same helper.
* `proxy.ts` runs Clerk middleware on `/api` but does not protect API routes; each route declares `auth` itself and fails closed.
* Authorization is a service-layer decision (`/docs/security.md`). The adapter only maps `ForbiddenError` to `403`. No domain roles or permissions exist yet.

## Relationship to the service layer

The adapter is to HTTP what a Server Action is to forms: it translates transport into a typed call and a `Result` back into transport. Services stay framework-free and identical for Web, API, and Mobile. Do not duplicate service logic in handlers; do not call Drizzle or `getDb()` from routes.

## Adding an endpoint

```ts
// app/api/v1/<thing>/route.ts
export const POST = apiRoute({
  auth: "required",
  input: { schema: createThingSchema },          // from @signalone/validation
  handle: (ctx, input) => thingService.create(ctx, input), // composition root supplies deps
});
```

Add a unit/integration test through `createApiRoute` with a fake `getUserId` and a fake service (see `apps/web/lib/api/api.test.ts`).

## Web and mobile expectations

* Both call the same endpoints and the same envelope; neither accesses Neon or Drizzle. Next.js Server Components and Server Actions may call services directly on the server; use HTTP where a client genuinely needs it (mobile, external callers, client-side fetching).
* Mobile sends `Authorization: Bearer <Clerk token>` and uses `EXPO_PUBLIC_*` only for the API base URL. Request/response types come from `@signalone/shared` and `@signalone/validation`, never from the database.
* CORS is not configured; mobile native clients do not need it. Browser clients on other origins are not supported yet.

## Proof

`GET /api/v1/status` is a generic public endpoint (`{ status, version }`). `lib/api/api.test.ts` drives requests through the adapter with a generic test-only service (success, invalid/malformed/oversized input, 401, 403, 404, 409, unexpected 500, error serialization); `app/api/routes.test.ts` covers the real wiring and routing convention.

<!-- boilerplate:proof:start -->
## Vertical-slice proof: generic "proof item" (Issue 49)

`/api/v1/proof-items` (`GET` list, `POST` create, `DELETE ?id=<uuid>`) is a deliberately generic, disposable feature proving Web/Mobile -> API -> auth -> validation -> service -> data access -> Drizzle -> Postgres. It is not a Signal One concept.

| Layer | File |
| --- | --- |
| Contracts + shared client (client-safe) | `packages/validation/src/proof-item.ts`, `api-client.ts` |
| Route definitions (reused by tests) | `apps/web/lib/api/proof-items.ts`; Next route `app/api/v1/proof-items/route.ts` |
| Service (cap, ownership, authorization) | `apps/web/lib/services/proof-items.ts` |
| Composition root | `apps/web/lib/composition.ts` |
| Data access, table | `apps/web/db/proof-items.ts`, `db/schema.ts` (`proof_item`), migration `drizzle/0001_proof_item.sql` |
| Web UI | `app/proof/page.tsx`, `components/proof/proof-items-panel.tsx` |
| Mobile | `apps/mobile/src/proof/` |
| Tests | `proof-items.acceptance-suite.ts` (+ `.acceptance.test.ts`, `db/proof-items.integration.test.ts`), `services/proof-items.test.ts`, `report.test.ts`, `e2e/proof-items.spec.ts` |

Rules proven: caller-owned data only (list scoped; deleting another user's item is `403`, unknown `404`, malformed id `400`); per-user cap (`409`); unique `(owner, label)` (`409` generic `Conflict` from the database constraint); public item shape `{ id, label, createdAt }` independent of the row type.

The shared client (`createApiClient`) is used identically by Web (`baseUrl: ""`, cookie session) and Mobile (absolute base URL, bearer token). It validates every response against the contract and never throws.

### Removing the proof feature

Delete the files above, the `proof_item` export in `db/schema.ts`, the `/proof(.*)` matcher in `proxy.ts`, the mobile `ProofItemsScreen` wiring in `App.tsx`, and add a migration that drops `proof_item`. The generic infrastructure (adapter, `createApiClient`, `reportUnexpectedError`, composition root pattern, Playwright/integration setup) stays.

<!-- boilerplate:proof:end -->

## Member endpoints (S1, reference application)

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /api/v1/me` | member | The caller's profile (created on first sign-in) with the policy status. Allowed before accepting the current policy |
| `PATCH /api/v1/me` | member, policy accepted | Change `displayName`, `emailPref`, `timeZone` only; any other field is rejected |
| `DELETE /api/v1/me` | member | Erase the caller's data, then the Clerk identity. Safe to repeat. Allowed without re-accepting the policy |
| `POST /api/v1/me/policy-acceptance` | member | Accept the current Terms and Privacy Policy and attest to being 18 or older |
| `GET /api/v1/me/export` | member | Everything held about the caller, as JSON. Allowed without re-accepting the policy |
| `POST /api/v1/webhooks/clerk` | signature | Clerk calls it; a verified `user.deleted` event uses the same erase path. Needs `CLERK_WEBHOOK_SIGNING_SECRET` |

A member endpoint other than the three allowed ones answers `403` with the code `policy_reacceptance_required` until the member accepts the current policy version. A handler that must see the exact request bytes (a signed webhook) receives the raw request as the third argument of `handle`.

## Organization endpoints (S2, reference application)

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `POST /api/v1/organizations/claim` | member, policy accepted | Claim a Church/Ministry (name, 1 to 3 web links, contact email). Creates a pending request; gives no rights. At most 5 a day |
| `GET /api/v1/organizations/:id` | public | Name, description, links and status of an **approved** organization; anything else is `404` |
| `PATCH /api/v1/organizations/:id` | manager of that organization, or admin | Change name, description or links; anyone else gets `404` |
| `POST /api/v1/organizations/:id/managers/:userId/revoke` | manager of that organization, or admin | Remove a manager, with a reason. Takes effect on their next request |
| `GET /api/v1/me/organizations` | member | The caller's own organizations and their standing in each |
| `GET /api/v1/admin/manager-requests` | admin | Claims waiting for a decision |
| `POST /api/v1/admin/manager-requests/:id/decision` | admin | Approve or reject, with a required reason. A decision cannot be repeated (`409`) |
| `GET /api/v1/admin/audit` | admin | The append-only audit log |

Admin endpoints answer `404` to everyone who is not an admin. Path parameters are declared on the route (`params: { schema }`) and validated; a malformed one is `404`.

## Unexpected-error reporting

`apiRoute` passes `reportUnexpectedError` (`lib/api/report.ts`) as the adapter's `onUnexpected` hook. It writes one structured stderr line with the error class and, for `DatabaseError`, the operation and kind only (never message, cause, stack, request data, or identity). This is a stopgap sink, not a logging system; replace the sink when one is chosen. The adapter also reports failures that escape the normal path (for example response serialization).

## Not decided yet

Mobile token verification has not been exercised end to end (no Clerk-authenticated live call in CI); rate limiting; CORS; request IDs and a real logging system; idempotency keys; pagination conventions beyond `Paginated<T>`; OpenAPI generation; path parameters in the adapter (the proof uses a query-string `id`).
