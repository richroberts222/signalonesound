# ARCH: Architecture, Boundaries, Contracts, Compatibility

Examined 2026-10-08 (Pass 2) at `main` `826b53e`; none of the six commits since the baseline `31ec6ba` touches an ARCH-owning file. Depth: Standard. Home for: layer boundaries; shared packages; API design, envelope, versioning and deprecation; web and mobile contract compatibility; idempotency and concurrency semantics; time, identifier and pagination conventions; external dependency failure handling at the design level (`methodology.md` section 4).

## Method note

Evidence was gathered before the prior-input rows for ARCH were re-read. Read in full: `docs/api.md`; `docs/architecture-rules.md` sections 22 to 29 (the layer, identity and contract rules; the earlier sections were sampled); `packages/shared/src/{contracts,result}.ts`; `packages/validation/src/api-client.ts`; `apps/web/lib/api/{handler,route}.ts`, `lib/services/{run,context,proof-items}.ts`, `lib/auth/*`. Headings and sizes only for `docs/data-fetching.md` (628 lines) and `docs/data-mutations.md` (908 lines): their rule text was searched for time, concurrency and error conventions, not read end to end (Standard depth). `docs/routing.md` and `docs/server-components.md` are empty (0 lines).

Run (RUN, 2026-10-08): the web test suite (171 tests, including the static layer-boundary tests) passes; a search of the services and the app folder for direct database imports (below); the Production API probes already recorded in AUTH.

Not examined, and why: the Server Component and page data-loading patterns (the pages are mock and read static data); the mobile client in a running app; the standalone template's own architecture.

## Findings

### F-ARCH-001 The conventions that are expensive to change are undecided: event times and recurrence, idempotency, concurrency, pagination limits, locale, units and money

| Field | Value |
| --- | --- |
| Status | Accepted |
| Severity | Medium |
| Confidence | High that the conventions are absent; Medium on the specific defaults recommended |
| Timing | Before the first product table or endpoint |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S (a one-page document), M with tests |

**Evidence**: `docs/api.md` "Not decided yet" lists idempotency keys, pagination conventions beyond `Paginated<T>`, request identifiers, path parameters and OpenAPI. `docs/data-fetching.md:331-337` and `docs/data-mutations.md:603-606` say only "do not rely on accidental JavaScript timezone conversion" and "use a timezone-aware representation". The contract code has `Paginated<T>` with an opaque cursor but no page-size limit, sort rule or maximum (`contracts.ts`); the only list (`listByOwner`) is bounded by a per-user business cap, not by the contract. Wire timestamps are ISO strings (`createdAt.toISOString()`); identifiers are random UUIDs; there is no version or ETag on any row, and the DATA examination found no locked read-modify-write (F-DATA-010). The product plan expects worldwide use (Q-009), paid memberships, events with a place and a time, radius search in miles or kilometres, and push notifications.

**Observation**: A gathering is a place-bound event: "Friday 7 pm" means 7 pm where the venue is, and a weekly service recurs at the same local time across daylight-saving changes. If events are stored as a single universal timestamp with no venue zone, or recurrence is expanded in universal time, every recurring event shifts by an hour twice a year, and fixing it later means rewriting stored data. The other conventions are cheaper to add early than to retrofit across three clients, but they share the property that a published mobile app cannot be changed on demand.

**Consequence**: The first domain endpoints bake in accidental answers to each question: wrong times for recurring events, duplicate records when a mobile app retries a request on a poor connection, lost updates when two managers edit the same event, unbounded lists, miles hard-coded.

**Recommendation** (engineering decisions, to be written once in `docs/api.md` or a short `docs/conventions.md` before the first domain endpoint, each with one test): (1) **Time**: store events as a universal instant plus the venue's IANA time zone name; recurring events as a rule in venue-local time, expanded per occurrence; send ISO 8601 with offset on the wire; display in the venue's zone by default. (2) **Idempotency**: accept an `Idempotency-Key` header on creating POSTs and record `(user, key, result)` for 24 hours, so a retried request returns the original result (this is what makes client retries safe, F-ARCH-002). (3) **Concurrency**: add an integer `version` to rows that more than one person can edit (events, organizations); an update must send the version it read and a mismatch returns `conflict`; do not add it to single-owner rows. (4) **Pagination**: cursor pagination with a default of 20 and a maximum of 100 and a stable sort including the identifier as a tiebreaker. (5) **Locale**: store a language and a distance-unit preference per user; store distances in metres and money as integer minor units plus an ISO currency code; keep all user-visible strings out of the API (clients translate error codes). (6) Record the **undecided-by-design** contracts with their triggers: file uploads (first feature with images), push notifications (first notification), search and geospatial (F-DATA-008).

**Alternatives and tradeoffs**: Decide each convention at the feature that needs it (spreads the decision across three clients and risks inconsistent answers). Adopt a full API framework or generator for these (premature). Skip optimistic concurrency and use last-write-wins (acceptable for single-owner rows only).

**Affects**: `docs/api.md` or a new short conventions document; `packages/shared` and `packages/validation` (pagination and idempotency helpers); the schema design (F-DATA-008, F-AUTH-002).

**Depends on / sequencing**: With the product schema design; the product-facing choices (do events recur at launch, which countries and currencies first) go to REQ.

**Verification**: A conventions page exists; a test shows a retried create with the same key returns the original result, a stale-version update returns `conflict`, and a recurring event keeps its local time across a daylight-saving change.

**Decisions needed**: none now; product behaviour (do events recur at launch) is carried to REQ.

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Reworded (Medium upheld, narrowed)
  Strongest case against: Six conventions at once, with an idempotency table, optimistic-concurrency columns and a cursor policy, for endpoints that do not exist. Most of these are additive later: a pagination maximum, an `Idempotency-Key` header and a `version` column can each be added by an additive migration or header. Only the time model and money and unit representation are expensive to reverse once data exists.
  Evidence re-checked: READ `docs/api.md` 'Not decided yet'; READ `packages/validation/src/contracts.ts`: `paginatedSchema` has `items` and `nextCursor` only, no size limit; READ `docs/data-fetching.md:331-337` ('timezone-aware representation'). No schema stores an event time yet.
  Result: Keep Medium for the part that is costly to retrofit: event time as an instant plus venue IANA zone and recurrence in venue-local time; units and money. Defer idempotency, row versions and pagination limits to the first endpoint that needs each, with the trigger written in `docs/api.md`. The one-page conventions document stays the deliverable; the tests wait for the endpoints.

**History**: 2026-10-08 created. Absorbs P-CH-09, P-CH-10, P-CH-12 (contract parts), and the DATA carry-forward on locked read-modify-write.


**History (Pass 4, 2026-10-08)**: reworded. Only time, units and money are decided before the first product table; the rest are triggers.

---

### F-ARCH-002 The client-server compatibility contract is thin: no timeout, no offline versus server error, no client version, no minimum supported version

| Field | Value |
| --- | --- |
| Status | Accepted |
| Severity | Low |
| Confidence | High for the client behaviour (READ); the impact depends on mobile adoption |
| Timing | Trigger: the first real mobile feature |
| Disposition | DEFER |
| Scope | MOBILE |
| Trigger class | Trigger-gated |
| Effort | S to M |

**Evidence**: `api-client.ts` sets no timeout, so a stalled request never resolves; every failure (no network, a refused connection, a malformed response, a server error) becomes the same `internal` result with the same message (READ, `request()` catch-all). `ERROR_CODES` has no code for "unavailable". `X-API-Version` is sent by the server only; no request header tells the server the client's version, platform or build. `docs/api.md` Versioning says removals need a new `/api/v2` that runs alongside `v1` "until clients migrate", but no minimum supported version, response for an unsupported client, or sunset rule exists (F-REL-005).

**Observation**: The envelope, the status mapping and the additive-only rule are good. What is missing is the part that matters most for a mobile app used at gatherings with weak signal: the app cannot tell "you are offline" from "the service is broken", cannot give up on a hung request, and the server cannot recognise an app too old to work. Retrying safely also needs idempotency (F-ARCH-001).

**Consequence**: A user on a bad connection sees a generic "something went wrong" or a spinner that never ends; the first incompatible API change strands installed apps with no way to tell them to update.

**Recommendation** (at the trigger, as one mobile-readiness slice with F-AUTH-005 and F-REL-005; nothing now): In the shared client: apply a request timeout (for example 15 seconds) with `AbortController`; return a distinct client-side `network` outcome (not a new wire code) for "no response", so screens can show an offline message; retry only GETs and idempotent creates, with a small bounded backoff. Add `X-Client-Version` and `X-Client-Platform` request headers; add `minSupportedClientVersion` to `GET /api/v1/status`; and add one additive error code (`upgrade_required`, HTTP 426) returned for clients below the minimum. Write the deprecation rule: a field or version is announced, kept for at least one store-review cycle plus a margin, then removed.

**Alternatives and tradeoffs**: Rely on store update nagging (no control). Force updates through the stores only (slow, no signal). Do nothing until the first break (the cost is a stranded install base).

**Affects**: `packages/validation/src/api-client.ts`, `packages/shared` (headers, status payload, one error code), `docs/api.md`, `docs/mobile.md`.

**Depends on / sequencing**: F-ARCH-001 (idempotency), F-REL-005 (release policy), F-AUTH-005 (the same client carries the token).

**Verification**: A test with a hung fetch resolves with the network outcome within the timeout; an old version header receives `426 upgrade_required` with the standard envelope.

**Decisions needed**: none.

**Challenge log**:

Challenge (Pass 4, 2026-10-08): verdict Downgraded (disposition ADD to DEFER)
  Strongest case against: Trigger-gated on the first real mobile feature, which is paused. It overlaps F-REL-005 (release policy) and F-AUTH-005 (client token). It describes hypothetical mobile users on poor connections.
  Evidence re-checked: READ `packages/validation/src/api-client.ts`: no timeout; catch-all becomes `internal`. READ `docs/api.md` Versioning. Not run.
  Result: The observations are accurate; the disposition ADD implied work now. DEFER with its stated trigger, and fold the three mobile items (token, client contract, release policy) into one mobile-readiness slice when the trigger fires. Low.

Challenge (Pass 4b, 2026-10-08): verdict Upheld
  Re-checked: RUN `grep -c 'AbortController\|timeout' packages/validation/src/api-client.ts`: 0 (no timeout). Trigger is a mobile feature that does not exist.
  Result: Low / DEFER holds; body labelled trigger-time. Grade: RUN.

**History**: 2026-10-08 created. Absorbs P-CH-11 (client side), P-CH-21, and the ARCH part of P-78-T04. The server side of dependency failures (Clerk or database unavailable) fails closed or returns a generic 500 and is recorded under OPS.


**History (Pass 4, 2026-10-08)**: ADD to DEFER; the work is gated by a mobile feature that does not exist.

**History (Pass 4b, 2026-10-08)**: Recommendation labelled as trigger-time work, folded with F-AUTH-005 and F-REL-005.

---

### F-ARCH-003 `routing.md` and `server-components.md` are empty while pages will start loading real data

| Field | Value |
| --- | --- |
| Status | Accepted |
| Severity | Low |
| Confidence | High |
| Timing | Trigger: the first product page that loads real data |
| Disposition | DEFER |
| Scope | WEB |
| Trigger class | Trigger-gated |
| Effort | S |

**Evidence**: Both files are empty, which by this repository's rule means no rules exist (`CLAUDE.md` section 3). All current pages read static mock data from `lib/*/mock-data` modules. `docs/api.md` says Server Components may call services directly or the API may be used, without saying which to prefer or how errors, loading states and not-found behave.

**Observation**: There is no decision to be missed today. The risk is that the first real-data pages (written by a person or an agent) each answer "service call or API call, where does the error go, how is the route organised" differently.

**Consequence**: Inconsistent data-loading patterns across the first dozen pages, then a refactor.

**Recommendation**: Do not write speculative rules. At the first real-data page, write two short documents from what was actually built: where Server Components call services directly (the recommended default: it avoids a network hop and keeps one authorization path through the service layer), where the API is used (mobile, client-side fetching, external callers), the standard loading, error and not-found handling, and the route-group layout.

**Alternatives and tradeoffs**: Write now (guesses). Leave empty (the current state; fine until the trigger).

**Affects**: `docs/routing.md`, `docs/server-components.md`.

**Depends on / sequencing**: The first real-data page.

**Verification**: The two documents exist and the second real-data page follows them without new decisions.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-08 created.

---

### F-ARCH-004 The layer boundaries are real and machine-enforced; the envelope and error mapping are consistent

KEEP. Evidence: the documented flow (client, API or server boundary, service, data access, Drizzle, Postgres) holds in code: services import only types and the database error class from the database folder (`atomic.ts`, `proof-items.ts`, `run.ts`; RUN search), and no page or route handler in `app/` imports `getDb` or `@/db` (RUN search, no matches). Static tests prove the API adapter cannot import Next.js, Clerk, `server-only` or the database, client components cannot import server-only code, and shared packages cannot read the environment (C-07, C-37). Every response is the one `Result` envelope with a mapped status and generic messages; unknown versions return the standard `not_found`; changes within a version are additive. Why it is sound: the boundaries are the simplest ones that keep the clients replaceable (`architecture-rules.md` section 29) and are tested, not just written. Tripwire: a service that imports the database client directly, a route that returns a row type, a second error shape, or a breaking change inside `v1`.

---

## Reconciliation of prior inputs (ARCH)

| Input | Outcome |
| --- | --- |
| P-CH-09 idempotency and concurrency | Adopted → F-ARCH-001 (with the DATA findings) |
| P-CH-10 time and identifier conventions | Adopted → F-ARCH-001 |
| P-CH-11 external dependency failure handling | Client side → F-ARCH-002; server side stays with OPS (Clerk and database outages fail closed or return a generic 500; no retry layer is needed at this scale) |
| P-CH-12 upload, notification, search, geospatial contracts | Recorded as trigger-gated items inside F-ARCH-001; search and geospatial detail in F-DATA-008 |
| P-CH-21 long-term compatibility | Adopted → F-ARCH-002 |
| P-78-T04 API deprecation and minimum version (ARCH part) | Adopted → F-ARCH-002 |
| P-CQ-P1 services import `DatabaseError` and the `Database` type from the database layer | Resolved → F-ARCH-004 (type and error class only; acceptable) |
| P-GAP-01 no real Clerk-authenticated mobile call | Cross-referenced → F-AUTH-005 |

Challenges to prior work: the **not-found versus forbidden** guidance already exists in `docs/api.md` ("not_found ... preferred when existence must not be revealed"), while the proof service returns `forbidden`: F-AUTH-007 stands as a convention to apply to the first sensitive resource, not as a missing rule. No prior finding was rejected.

## Lens matrix

| Lens | Result |
| --- | --- |
| L1 Drift | Examined, nothing material in `api.md` (it matches the code, including its own "Not decided yet" list). The systemic drift in `architecture-rules.md` (1,100 lines, uneven structure) belongs to DEVOS (F-DEVOS-003). |
| L2 Enforcement | F-ARCH-004 (boundaries that bite), F-ARCH-001 (conventions that would be prose). |
| L3 Adversary | Examined, nothing material beyond SEC and AUTH (boundary and authentication are covered there). |
| L4 Failure and recovery | F-ARCH-002 (hung requests, offline versus server error), F-ARCH-001 (retries and duplicates). |
| L5 Scale and cost | F-ARCH-001 (unbounded pagination contract, page-size limits). |
| L6 Longevity | F-ARCH-001 (stored times and money are the hardest data to fix), F-ARCH-002 (stranded installed apps). |
| L7 Compatibility | F-ARCH-002 (client version and minimum supported version), F-ARCH-004 (additive-only versioning). |
| L8 Simplicity | F-ARCH-004 (do not add layers); F-ARCH-001 prefers a one-page document and a few helpers over a framework; F-ARCH-003 declines speculative rules. |
| L9 Boilerplate fit | F-ARCH-001's helpers (idempotency, pagination, version column) and F-ARCH-002's client changes belong in the template; F-ARCH-003 is product-specific. |

## Carry-forward to other subjects

* **REQ**: do events recur at launch (weekly services, series); are events shown in the venue's local time (recommended default); which currencies and countries first (Q-009); whether push notifications and file uploads are in the first release.
* **DATA**: the `version` column and idempotency table belong in the first product schema (F-ARCH-001); location, search and geospatial (F-DATA-008).
* **TEST**: tests for retry, stale-version update, daylight-saving recurrence, client timeout and `upgrade_required`.
* **OPS**: server-side dependency failure handling (Clerk or Neon unavailable), request identifiers, rate limiting with `rate_limited` (reserved today).
* **REL**: minimum supported client version as part of the mobile release policy (F-REL-005).
* **BOIL**: pagination, idempotency, version-column and client-timeout helpers are template candidates.
