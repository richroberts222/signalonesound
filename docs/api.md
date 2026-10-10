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

## Event endpoints (S3, reference application)

All require an approved manager of the event's organization (or an admin); anyone else gets `404`. The public read arrives with search (S4).

| Endpoint | Purpose |
| --- | --- |
| `POST /api/v1/organizations/:id/events` | Create an event or a recurring series. Needs an `Idempotency-Key` header (8 to 128 letters, digits, `-`, `_`); a repeat within 24 hours returns the first result. Times are local wall-clock (`startLocal`, `endLocal`) plus `timeZone`; the response also has the exact moment (`startsAt`, UTC). `publish: false` saves a draft. An overlapping event at the same venue needs `duplicateOverrideReason` (`409` without it) |
| `GET /api/v1/organizations/:id/events?filter=upcoming\|past\|drafts&cursor=&limit=` | The organization's events, keyset-paged (default 20, maximum 50). Deleted events are never listed |
| `GET /api/v1/events/:id` | One event in any state, including deleted |
| `PATCH /api/v1/events/:id` | Edit. `version` is required (`409` if stale); `scope` is `this` (the occurrence becomes an exception) or `series` (the later occurrences that follow the series). Past events cannot be edited |
| `POST /api/v1/events/:id/publish` | Draft to published (not for a past event) |
| `POST /api/v1/events/:id/cancel` | Published to cancelled (stays visible as cancelled until its date passes) |
| `DELETE /api/v1/events/:id` | Soft delete; allowed for past events |

A recurring series (weekly or monthly by weekday up to a date, or a list of dates) is expanded into ordinary event rows, at most 104 and within two years, each keeping the same local time of day across daylight-saving changes. The path parameter and the cursor are validated; a malformed id is `404`.

## Discover endpoints (S4, reference application)

All public: no sign-in, no identity read, and nothing recorded about who searched (analytics receive only the name of the event, never an identifier).

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/events` | Search upcoming published and cancelled events of approved organizations. Query: `lat`, `lng` (both or neither; rounded to about 1 km, never stored), `radius` (miles up to the radius setting, or `any`; needs a position), `from`, `to` (calendar dates compared with each event's own local date), `types` (comma separated, any of), `organizationId`, `cursor`, `limit` (default 20, maximum 50). With a position, results are nearest first (events with no position are left out); otherwise soonest first. Unknown parameters (there is no free-text search) are `400` |
| `GET /api/v1/events/:id/public` | One event as the public sees it; a draft, a deleted or held event, or one of an unapproved organization is `404`. (The manager's read of any state stays `GET /api/v1/events/:id`) |
| `GET /api/v1/places/search?q=` | Turns a ZIP code or `City, ST` into positions from the US Census gazetteer shipped with the app (public domain; no outside service is called) |

The radius "X" in the source plan is undecided: it is the single setting `RADIUS_X_MILES` (placeholder 100) in `packages/validation/src/discover.ts`.

## Saved events, invites and scheduled jobs (S6, reference application)

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /api/v1/me/saved-events?cursor=&limit=` | member | The caller's saved events, upcoming first then past, keyset-paged. A deleted or held event is returned only as `removed`, with no detail |
| `GET /api/v1/me/saved-events/:eventId` | member | Whether the caller saved this event |
| `PUT /api/v1/me/saved-events/:eventId` | member, policy accepted | Save a **public** event (drafts, deleted and unknown ids are `404`); saving twice is once; at most 500 |
| `DELETE /api/v1/me/saved-events/:eventId` | member | Remove it; removing one that is not saved succeeds |
| `POST /api/v1/me/invites` | member, policy accepted | A random invite token (192 bits, shown once; only its hash is kept), valid 30 days; at most 10 a day |
| `POST /api/v1/invites/:token/arrival` | public | Count one arrival from an invite link. Records nothing about the visitor |
| `GET /api/v1/internal/jobs/retention` | scheduler secret | Daily: removes saved events 30 days after the event ended and expired invite links. Needs `Authorization: Bearer <CRON_SECRET>`; refused when no secret is configured |

Nothing returns who saved an event, and no count of saves is exposed. The schedule is in `apps/web/vercel.json`; a test fails if a scheduled path does not exist or a job route is not scheduled.

## Reports and admin moderation (S8, reference application)

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `POST /api/v1/reports` | public | Report an event or a church (`subjectType`, `subjectId`, `reason` from a fixed list, optional `details` up to 1000 characters). No sign-in, no reporter identity is read or stored. At most 5 per network address per day (the address is kept only as a keyed hash for 24 hours); only a public event or an approved church can be reported |
| `GET /api/v1/admin/overview` | admin | Counts: open reports, pending claims, hidden events, unpublished churches, suspended members |
| `GET /api/v1/admin/reports?status=` | admin | The report queue (`open`, `dismissed`, `actioned`) |
| `POST /api/v1/admin/reports/:id/decision` | admin | Dismiss a report or mark it acted on (`409` if already decided) |
| `POST /api/v1/admin/events/:id/hide` and `/restore` | admin | Hide an event from the public, or make it public again (`409` if it is already in that state) |
| `POST /api/v1/admin/organizations/:id/unpublish` and `/restore` | admin | Unpublish or restore a church or ministry |
| `POST /api/v1/admin/members/:userId/suspend` and `/reinstate` | admin | Suspend a member (they cannot change events or submit claims; they can still browse, export and delete); `eventsAction` says whether the events of the churches they manage stay public or are hidden. An admin cannot be suspended |
| `GET /api/v1/admin/audit/search?actor=&subject=&from=&to=&limit=` | admin | The audit log, filtered |
| `GET /api/v1/admin/audit/export` | admin | The same, for a legal request; the export is itself written to the audit log |

Every admin write needs a non-empty reason and is written to the audit log in the same single database statement as the change, so a change without its entry (or the reverse) cannot happen and a repeated change writes nothing. Every admin route answers `404` to anyone who is not an admin, and the admin list is checked on every request. The people affected by a hide, an unpublish or a suspension are emailed what happened, the reason and how to appeal, with no one else's details; until an email provider is chosen the email port records only that nothing was sent.

## Alerts, push and notification settings (S7, reference application)

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /api/v1/me/alerts`, `POST /api/v1/me/alerts` | member (create: policy accepted) | The caller's alerts; create one (`place` as a ZIP or `City, ST`, `radius` 1 to the radius setting or `any`, `timeframeDays` 7, 14 or 30, `types`, `immediate`). At most 10. The place becomes a point rounded to about 1 km with its label; an unknown place is `400` |
| `PATCH /api/v1/me/alerts/:id`, `DELETE /api/v1/me/alerts/:id` | member | Edit, pause (`paused`) or delete; another member's alert is `404` |
| `POST /api/v1/me/push-tokens`, `DELETE /api/v1/me/push-tokens/:id` | member | Register a phone's push address (a phone belongs to one member at a time); forget it |
| `GET /api/v1/me/notification-settings`, `PUT` | member | Reminders for saved events on or off |
| `PUT/DELETE /api/v1/me/organization-mutes/:orgId` | member | Stop (or resume) hearing about one church; always succeeds |
| `POST /api/v1/unsubscribe/:token` | public (signed link) | One-tap unsubscribe: mutes the church or pauses the alert the link was made for; a forged, altered or expired link is `404`; with no `UNSUBSCRIBE_SECRET` configured it is `400` |
| `GET /api/v1/internal/jobs/notifications` | scheduler secret | Queues reminders, sends what is due (quiet hours, caps and the monthly ceiling apply) and removes rows 30 days after they finish |

**Policy** (`apps/web/lib/notifications/policy.ts`, proven by time-travel tests): nothing is sent between 9 pm and 8 am on the member's clock; a new-event alert goes in one daily digest at 9 am unless the member chose immediate alerts, and then only one immediate alert is sent a day; at most 3 new-event alerts per church per member per week; reminders and changes to a saved event are not capped but wait out quiet hours; changes to an event are coalesced to one message an hour. A message holds only a title and a place. Queuing is idempotent; a provider failure retries with backoff (2, 4, 8, 16 minutes) and then drops with a note; a push address the service rejects is deleted; a monthly ceiling (9,000) stops sending and raises a problem before the free tier is exceeded.

## Billing: plans, payment switches and entitlement (S10, reference application)

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `GET /api/v1/admin/billing/rules`, `PUT /api/v1/admin/billing/rules/:accountType` | admin | Who pays, per account type (`member`, `organization`): `paymentRequired` (off by default), `trialDays` (0 to 365) and `defaultPlanId` |
| `GET /api/v1/admin/billing/plans`, `POST /api/v1/admin/billing/plans` | admin | List plans; create one (starts inactive). A price is `amountMinor` (whole cents, at most 1,000,000) plus `currency` (`usd`), never a decimal |
| `PATCH /api/v1/admin/billing/plans/:id` | admin | Rename, turn on or off, or change the price; a price change adds a new price version and subscribers keep the one they bought |
| `GET /api/v1/admin/billing/coupons`, `POST /api/v1/admin/billing/coupons` | admin | List coupons; create one (`percentOff` or `amountOffMinor` with `currency`, optional `expiresAt` and `maxRedemptions`; one use per account; a duplicate code is `409`) |
| `PATCH /api/v1/admin/billing/coupons/:id` | admin | Turn on or off, change the expiry or the limit |
| `GET /api/v1/admin/billing/audit?limit=` | admin | Every billing change, newest first (who, when, from and to). Entries are append-only; the application offers no edit or delete |
| `GET /api/v1/me/entitlements` | member | The server's derived answer for the caller: `entitled`, `reason`, `status`, `trialEndsAt`. It takes no input, so a client cannot claim entitlement |
| `POST /api/v1/me/coupons/quote` | member | The price a coupon gives for an active member plan, in whole cents (rounded half up, never below zero). Read-only: records nothing. Refusals have distinct messages (inactive, expired, already used, limit reached) |

Every admin route answers `404` to anyone who is not an admin, checked on each call, and every admin change is written to the audit log together with the change. While payment is not required for an account type, everyone of that type is entitled and the payment provider is never asked. There is no route that takes a payment or subscribes anyone in S10 (the real checkout is S11), and no payment provider SDK is imported outside `lib/payments` (`lib/payments/boundary.test.ts`).

## Email suppression (S14, reference application)

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `POST /api/v1/internal/email/suppress` | job secret (`Authorization: Bearer <CRON_SECRET>`) | Records an address that bounced or complained (`address`, `reason` of `bounce` or `complaint`) so it is never emailed again. Only a keyed hash is stored; the reply never echoes the address; the same address twice is one entry. The email provider's bounce notifications are forwarded here when the provider account is connected |

## Public pages: contact form, Messages inbox and public plans (S15, reference application)

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `POST /api/v1/contact` | public | Send a message through the contact form: `topic` (`question`, `report_listing`, `privacy_request`, `other`), `name` (1 to 80), optional `replyEmail`, `message` (10 to 2000, plain text), and a hidden `website` field that must stay empty. Closed (`404`) unless `CONTACT_FORM_ENABLED` is `on`. A filled `website` is dropped quietly with the same reply. One address (kept only as a keyed hash) may send 3 a day (`429`). The reply is `{ received: true }` and never echoes the message |
| `GET /api/v1/admin/contact-messages?status=new\|done\|all` | admin | The Messages inbox, newest first |
| `PATCH /api/v1/admin/contact-messages/:id`, `DELETE /api/v1/admin/contact-messages/:id` | admin | Mark a message `new` or `done`; delete it (this is how its personal information is removed) |
| `GET /api/v1/plans` | public | The plans an admin has switched on and priced; an inactive plan never appears. The Services page shows the same list |

Every admin route answers `404` to anyone who is not an admin (`401` signed out), checked on each call.

## Unexpected-error reporting

`apiRoute` passes `reportUnexpectedError` (`lib/api/report.ts`) as the adapter's `onUnexpected` hook. It writes one structured stderr line with the error class and, for `DatabaseError`, the operation and kind only (never message, cause, stack, request data, or identity). This is a stopgap sink, not a logging system; replace the sink when one is chosen. The adapter also reports failures that escape the normal path (for example response serialization).

## Not decided yet

Mobile token verification has not been exercised end to end (no Clerk-authenticated live call in CI); rate limiting; CORS; request IDs and a real logging system; idempotency keys; pagination conventions beyond `Paginated<T>`; OpenAPI generation; path parameters in the adapter (the proof uses a query-string `id`).
