# AUTH: Identity, Authorization, Privacy, Abuse

Examined 2026-10-07 (Pass 2) at `main` `826b53e`. The recorded baseline is `31ec6ba`; `main` has moved by six commits since, none touching an AUTH-owning file (PR #84 manifest, #86 `docs/security.md`, #88 two test files), so no AUTH evidence was re-baselined. Depth: Deep. Home for: Clerk integration; session and token handling; the authorization model and deny-by-default enforcement; the authorization test pattern; webhooks and identity sync; data classification, privacy, consent, deletion and export policy; moderation and abuse controls (`methodology.md` section 4).

## Method note

Evidence was gathered before the prior-input rows for AUTH were re-read. Read in full: `apps/web/proxy.ts`; `lib/auth/{server,authorize,errors,index}.ts` and `auth.test.ts`; `lib/services/context.ts` and `proof-items.ts`; `lib/api/{handler,route}.ts`; `app/api/**` route files; the `app/layout.tsx`, `account`, `admin`, `dashboard/church` layouts and the sign-in page; `components/shell/app-header.tsx`; `db/schema.ts`; `e2e/global-setup.ts` and `playwright.config.ts`; mobile `config/env.ts` and `proof/proofClient.ts`; `docs/auth.md` in full (sections and appendix), `docs/security.md` auth parts, `docs/product/roadmap.md` and the product plan's user-data lines.

Run (RUN, 2026-10-07, read-only requests to the owner's own Production site, no credentials, no state change): unauthenticated and malformed-credential requests to `/api/v1/*` and to each protected page, with and without browser-style headers. Results: `/api/v1/proof-items` returns the 401 `unauthenticated` envelope for no credential, `Bearer not-a-real-token`, empty `Bearer`, `Basic`, a `text/plain` POST, and a DELETE; `/api/v1/status` is public and returns 200; `/api/v2/*` returns the `not_found` envelope; `/admin` and `/account` return a 307 Clerk handshake redirect to a Clerk **development-instance** domain for a browser-style request (a plain curl request gets 404, an artefact of the handshake and not a defect). Response header `X-Clerk-Auth-Reason: dev-browser-missing` and the page's `pk_test_` key type (external-state read-back) agree: **Production runs a Clerk development instance** (U-10, partly answered).

Not examined, and why: the Clerk dashboard (sign-up restrictions, bot protection, MFA, session lifetime, allowed origins, webhooks: U-10 to U-12, owner-relayed); a request carrying a **valid** Clerk token (no test user credentials were used or requested; the Playwright spec was not run); mobile (Clerk is not integrated there). No file was changed outside `docs/audit/`.

## Findings

### F-AUTH-001 The only authorization rule is ownership; every signed-in user reaches the admin and church areas, and the role model is undecided

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Medium |
| Confidence | High for the facts; the severity is driven by the absence of real data, not by the code |
| Timing | Before real data (or the first real admin write, whichever is first) |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | M |

**Evidence**: `apps/web/proxy.ts:3` protects `/dashboard`, `/account`, `/admin` and `/proof` with sign-in only. `app/admin/layout.tsx:5-8` and `app/dashboard/church/layout.tsx:4-5` say, in comments, that they are not authorization checks and that any signed-in user may explore (READ). `lib/auth/authorize.ts` offers `isOwner`, `anyOf`, `allOf` and no role rule (READ); `proof-items.ts` is the only service and uses `isOwner` (READ). Roles and organization membership are explicitly undecided (`docs/product/roadmap.md` "Not yet scheduled"; `naming-conventions.md` Organizer UNDECIDED). The sign-up page is public and Production is a Clerk development instance (RUN above), so any visitor who completes sign-up reaches `/admin` and `/dashboard/church`. Today everything behind them is mock data (CONSOLE: no real data, U-07 unverified).

**Observation**: The deny-by-default primitives are sound (F-AUTH-010). What is missing is the first real rule on top of them. The layouts re-check only that a session exists, and a failed check returns `null` (a blank page) instead of a not-found or redirect. The danger is not today's mock; it is that "any signed-in user may explore" is the pattern the first real admin screen will be copied from.

**Consequence**: The first real admin or church feature built on the current layouts is open to every account. A moderation queue or import tool reachable by an anonymous sign-up is an integrity and privacy incident, not an inconvenience.

**Recommendation**: (1) Decide the role model before real data (Q-010: product decisions for Rich; the mechanism is an engineering decision below). (2) Mechanism (engineering, recommended): platform admin is an allow-list of Clerk user IDs in server-only configuration, evaluated by a named `isPlatformAdmin` rule through `authorize`; organization-scoped roles (manager, moderator) are rows in the application database keyed by the Clerk user ID (the roadmap already treats roles as product-domain, and multiple managers per organization is a relational fact). Do **not** adopt Clerk Organizations for this: it adds vendor surface the product does not need yet. (3) Make `/admin` and `/dashboard/church` call `authorize` and respond with not-found for non-members, now, even for the mock; the cost is one rule and two lines per layout. (4) Add the deny-by-default test pattern (P-78-M13, P-CH-06): a table-driven matrix per service method over actor classes (anonymous, other user, owner, platform admin) asserting deny unless an allow rule exists, plus a static tripwire that every file under `app/admin/**` and every `auth: "required"` route names an authorization rule or an explicit "any signed-in user" marker.

**Alternatives and tradeoffs**: Do nothing until the schema review (cheapest, but the copy-the-pattern risk stays and an unauthorised mock reveals the product's admin layout to any account). Clerk Organizations or Clerk metadata roles (fewer tables, but roles split across two systems and Clerk becomes part of the product model; wrong for per-organization managers). A full RBAC library (rejected: L8, the product has not named three roles yet).

**Affects**: `proxy.ts` (unchanged), `app/admin/layout.tsx`, `app/dashboard/church/layout.tsx`, `lib/auth/authorize.ts`, `docs/auth.md`, `docs/services.md`, a new server-only configuration variable (`docs/environment.md`).

**Depends on / sequencing**: Q-010 (roles) before the schema; F-AUTH-002 (identity keys) in the same design pass; F-AUTH-004 (audit log) at the first privileged write.

**Verification**: A signed-in user outside the allow-list receives a not-found response from `/admin/*`; the matrix test fails when a service method gains an allow path without a test row; the static tripwire fails on a new admin file with no rule.

**Decisions needed**: Q-010 (answered 2026-10-08; see its Status for the owner's choices and the engineering decisions).

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created. Absorbs P-78-M13, P-CH-06, P-RM-01 (roles part), P-NOTES-01 (who is an admin, how granted); carry-forward from SEC and DATA (role model before real admin data). 2026-10-08: Q-010 answered. Two admins (the owner and one more person without an account yet); church managers request a role and an admin approves; a user never selects their own role. The recommended mechanism above is unchanged and now covers the request-and-approve flow (a pending-request record, then a membership row on approval).

---

### F-AUTH-002 Identity lifecycle is undefined: owner IDs are bare text, there is no user-deleted handling, and no webhook pattern exists

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Medium |
| Confidence | High for the facts; Medium for the consequence (it depends on the first user-owned domain table) |
| Timing | Before real data |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | M |

**Evidence**: `db/schema.ts:19` stores `owner_id` as `text` with no foreign key and no user table; `docs/auth.md` appendix states that nothing about users is stored and there is no application user table (READ). No webhook route exists under `app/api` (READ). No handling exists for a deleted, merged, or banned Clerk user, and nothing in the repository defines how a Clerk user ID maps to organization membership or to a profile row. `docs/auth.md` section 6 requires "a reliable association with the Clerk identity" and section 13 requires a clear source of truth per field.

**Observation**: Keying rows by the Clerk user ID with no foreign key is a defensible start: it avoids a second identity. But three questions have no answer yet: what happens to a user's rows when Clerk deletes the user, who creates the application-side profile row (first request, or a webhook), and how a webhook is verified and made idempotent.

**Consequence**: Without a deletion path, a deleted account's data stays (a privacy defect, F-AUTH-003) and orphan rows accumulate. If profile rows are created by webhook without signature checking and idempotent handling, a replayed or forged event creates or deletes data.

**Recommendation**: At the design pass for the first user-owned domain table: (1) Prefer **lazy creation on first authenticated request** (an upsert keyed on the Clerk user ID, inside the service layer) over a webhook for profile creation; it removes the webhook as a required dependency. (2) Add a Clerk `user.deleted` webhook as the one required webhook, with Svix signature verification, an idempotency table keyed by the event ID, and a handler that deletes or anonymises according to the policy in F-AUTH-003. Document the pattern in `docs/auth.md` as the template for any later webhook. (3) Decide foreign keys: a `user_profile` table with `clerk_user_id` as a unique key, and owned tables referencing it with `ON DELETE` behaviour chosen per table. Do this with the first domain schema, not before.

**Alternatives and tradeoffs**: Webhook-only creation (adds a hard dependency on delivery and ordering). No application user table, ever (works only if no product feature needs a profile or membership; the roadmap names both). Doing it now (speculative: there is no domain table yet).

**Affects**: `db/schema.ts`, a new webhook route, `lib/services`, `docs/auth.md`, `docs/database.md`.

**Depends on / sequencing**: F-AUTH-003 (deletion policy) and Q-009; F-AUTH-001 (membership tables); DATA's migration procedure (F-DATA-001).

**Verification**: A unit test posts a valid, an invalid-signature and a replayed `user.deleted` payload and asserts one deletion, one rejection, one no-op; an integration test shows the owner's rows follow the chosen policy.

**Decisions needed**: Q-009.

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created. Absorbs P-78-M14; carry-forward from DATA (Clerk user-deleted handling and webhook idempotency, F-DATA-009).

---

### F-AUTH-003 No privacy, data-classification, age or deletion policy exists, though the product plan implies sensitive data

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Medium |
| Confidence | Medium (the legal characterisation is INFER and needs counsel; the absence of any policy is READ) |
| Timing | Before real data (and before any public sign-up) |
| Disposition | ADD |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | M |

**Evidence**: `docs/product/product-plan.md` lines 40 to 98 (READ) plan GPS and radius search, push-notification criteria by location and timeframe, friend invitations, free and paid member accounts, and a church portal. The roadmap lists moderation and provenance but no privacy topic. A search of `docs/` for privacy policy, consent, minors or age limits, GDPR/CCPA, account deletion, export and retention finds no decision (READ). Clerk will hold email addresses and possibly phone numbers; Neon is in AWS US West (Oregon) (external-state, UI-RELAY).

**Observation**: A user's membership of, attendance at, and location relative to religious gatherings reveals religious belief. In the EU and UK religious belief is a special category of personal data, and several US state privacy laws treat it as sensitive data (INFER; a legal question, not an audit determination). Together with precise location, this is the most sensitive kind of data a small product can hold, and the plan gathers it by design. No decision exists on the minimum age, the countries served, what is retained, or how a user deletes or exports their data.

**Consequence**: Collecting such data without a policy, a lawful basis, an age floor, and a working deletion path is a legal exposure that cannot be fixed afterwards by code: data already collected is already held. It also decides architecture (location precision, retention, where logs go).

**Recommendation**: (1) Treat this as a gate, not a task: no public sign-up and no collection of location or notification preferences until Q-009 is answered and a minimum policy exists. (2) The engineering minimum, once decided: a one-page data inventory (field, purpose, location, retention), coarse-by-default location storage (round or geohash, store precise coordinates only if a feature needs them), a deletion path that works end to end (Clerk delete, then F-AUTH-002 handler, then dependent rows), an export function if required by the jurisdictions chosen, and no third-party analytics or session replay without a decision (P-78-O05). (3) Have counsel review the policy text; the audit does not provide legal advice.

**Alternatives and tradeoffs**: US-only, adults-only, minimal collection (smallest obligations, a product decision for Rich). Collect broadly and write the policy later (rejected: the data cannot be un-collected). A privacy platform or consent-management vendor (premature for zero users).

**Affects**: `docs/auth.md`, a new data inventory, `docs/security.md`, the schema design (location, notification preferences), the member mock pages (`/account/notifications`).

**Depends on / sequencing**: Q-009 (decision for Rich); F-AUTH-002 (deletion handler); F-DATA-009 (retention and export on the data side); F-DATA-008 (location model).

**Verification**: A policy page and data inventory exist and match the schema; a deletion request removes the Clerk user and all application rows in a test; the member notification mock does not persist location until the gate is lifted.

**Decisions needed**: Q-009 (answered 2026-10-08 except the legal-review residual risk, which belongs to the owner; see its Status).

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created. Absorbs P-78-M10, P-CH-07, P-CH-33, P-78-T11, and the privacy part of P-78-O05. 2026-10-08: Q-009 answered. Age 18 or over; US first with worldwide planning; terms and privacy acceptance at sign-up; legal review undecided (owner's residual-risk decision; hard gate before any non-US user).

---

### F-AUTH-004 No audit trail or moderation accountability for privileged actions

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | Medium |
| Timing | Trigger: the first real admin or moderator write |
| Disposition | DEFER |
| Scope | BOTH |
| Trigger class | Trigger-gated |
| Effort | S to M |

**Evidence**: The admin and import flows are mock (`app/admin/**`); there is no write path, so no audit table, no actor-and-action log, and no moderation-decision record (READ). The roadmap lists "audit/history of who changed what and when" and reviewer and reason on moderation as data concepts, not designs. No report, block, or flag mechanism for user content exists (READ).

**Observation**: Nothing is wrong today because nothing privileged can be done. The first moderation decision or bulk import, however, needs to be attributable and reversible, and an append-only record is cheap to add alongside the first write and expensive to retrofit.

**Consequence**: At the first real admin write: no answer to "who approved this, when, and why", and no way to reverse a bulk import.

**Recommendation**: At the trigger, add an append-only `audit_event` table written inside the same transaction as the privileged change (actor Clerk ID, action, subject, before and after summary, time), and make moderation decisions records, not state flips. Abuse controls for user-generated content (report, block, rate) are decided together with the real submission flow (Q-010).

**Alternatives and tradeoffs**: Application logging only (not tamper-resistant and not queryable by product). A third-party audit service (premature).

**Affects**: `db/schema.ts`, `lib/services`, `docs/security.md`.

**Depends on / sequencing**: F-AUTH-001 (roles) and F-AUTH-002 (identity) first.

**Verification**: At the trigger, a privileged service call without an audit row in the same transaction fails a test.

**Decisions needed**: none now.

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created. Absorbs P-78-T01.

---

### F-AUTH-005 The mobile authentication path has never carried a real token

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Medium |
| Confidence | Medium (the server half is RUN against invalid tokens only; the client half is READ) |
| Timing | Before real mobile authentication (the first mobile feature that needs a user) |
| Disposition | ADD |
| Scope | MOBILE |
| Trigger class | Trigger-gated |
| Effort | M |

**Evidence**: `apps/mobile/src/proof/proofClient.ts:17` sets `noToken`, a provider that always returns null; its comment says Clerk is not integrated in the mobile app. `@clerk/expo` is not a dependency (`apps/mobile/package.json`), and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` is parsed in `config/env.ts` but unused (READ). On the server, `lib/api/route.ts:7-10` relies on `clerkMiddleware` and `auth()` to accept a bearer session token; the RUN probes show a malformed, empty, or wrong-scheme `Authorization` header yields 401 with the generic envelope. No test anywhere sends a **valid** bearer token: the Playwright spec exercises the cookie path on web only and is not in CI (C-51).

**Observation**: The design claim in `docs/auth.md` and `docs/mobile.md` (one identity, one token verification, the same services for every client) is plausible and well structured, and the failure path is proven. The success path is unproven: nothing shows that a token minted in an Expo app is accepted by the Next.js API, which depends on Clerk's token template, authorized parties, the publishable key matching the server's instance, and clock skew handling. The token storage choice (secure storage) and the native sign-in redirect configuration are also undecided.

**Consequence**: The first real mobile feature meets all of those unknowns at once, late, on a device, with App Store timing around it.

**Recommendation**: Run a thin vertical spike when mobile authentication becomes the next slice, not before: add `@clerk/expo`, store the session token in secure storage, send it through the existing `getToken` seam, and add one test that calls a real route with a real development-instance token (a dedicated test user, credentials held only in local environment or a CI secret). Record the Clerk settings it depends on (authorized parties, token lifetime) in `docs/auth.md`. Do not build more mobile screens against `noToken`.

**Alternatives and tradeoffs**: Do it now (the app has no feature that needs a user; wasted if the first mobile screen changes). A custom token exchange (rejected: a second identity path contradicts `docs/auth.md` section 2).

**Affects**: `apps/mobile`, `docs/mobile.md`, `docs/auth.md`, `docs/testing.md`.

**Depends on / sequencing**: ARCH (one API contract across clients, P-GAP-01), TEST (secret-bearing E2E), REL (mobile build and OTA policy).

**Verification**: A test run authenticates a development-instance user in the Expo app (or a Node harness using the same token flow), calls the API with the bearer token and receives 200, then with a tampered token and receives 401.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created. Absorbs P-GAP-01.

---

### F-AUTH-006 The `docs/auth.md` appendix is stale in four places

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High |
| Timing | Now |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Foundational |
| Effort | S |

**Evidence**: (1) The appendix names `apps/web/components/auth/auth-header.tsx` and says the layout "renders `AuthHeader`"; the directory does not exist and the layout renders `AppShell`, whose header is `components/shell/app-header.tsx` (RUN `ls`; C-50). (2) It lists the routes `proxy.ts` protects as `/dashboard`, `/account` and `/proof`; `proxy.ts:3` also protects `/admin` (C-08). (3) It says "API token handling" is not implemented; the API adapter accepts a Clerk bearer token through `lib/api/route.ts` (the mobile client half is still absent, F-AUTH-005). (4) The Notes say future API routes "must call `auth()`"; the convention is now `apiRoute` with an `auth` option (`docs/api.md`). The remaining appendix statements were checked and are accurate (the home page and dashboard behave as described; the environment variable section matches). The appendix does not say that Production currently uses a Clerk development instance.

**Observation**: Small, and exactly the drift pattern F-DEVOS-003 describes. It is recorded here because the fix belongs in this document.

**Consequence**: A reader who trusts the appendix looks for a file that is gone and misses `/admin` in the route list.

**Recommendation**: Fix the appendix in the same PR as the first F-AUTH-001 change (the protected-route list and the role rule change together). Until then, correct the four points in one pass and add a line stating the Clerk instance type per environment.

**Alternatives and tradeoffs**: Delete the appendix and point at the code (loses the quick map; F-DEVOS-003 decides the pattern).

**Affects**: `docs/auth.md`.

**Depends on / sequencing**: None; ideally with F-AUTH-001.

**Verification**: Every path and route the appendix names exists (the doc-existence tripwire proposed in F-DEVOS-003 point 4 would check this).

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created. Absorbs C-08, C-50.

---

### F-AUTH-007 Deleting another user's item answers "forbidden", which confirms the item exists

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | High for the behaviour; the risk is negligible today (identifiers are random UUIDs) |
| Timing | Trigger: the first domain resource whose existence is itself sensitive |
| Disposition | IMPROVE |
| Scope | BOTH |
| Trigger class | Trigger-gated |
| Effort | S |

**Evidence**: `lib/services/proof-items.ts:50-57`: a missing item yields `not_found`; an item owned by someone else yields `forbidden` through `authorize` (READ). `db/schema.ts:18` uses `uuid().defaultRandom()` for the identifier.

**Observation**: A caller can distinguish "no such id" from "exists but not yours". With random UUIDs that cannot be guessed, this reveals nothing useful for the proof table. It is the pattern the first sensitive resource (an unpublished submission, a private event) would inherit.

**Consequence**: For a resource whose existence matters, enumerating identifiers or a leaked identifier confirms existence to any signed-in user.

**Recommendation**: Decide the convention now and write it in `docs/services.md`: for resources that are private to an owner or organization, a non-owner receives `not_found`, not `forbidden`; `forbidden` is for cases where the actor can legitimately know the resource exists (a visible but not editable event). No code change is needed for the proof table.

**Alternatives and tradeoffs**: Keep 403 everywhere (simple, leaks existence). Always 404 (hides real permission problems from legitimate users, harder to debug).

**Affects**: `docs/services.md`, `docs/api.md`, future services.

**Depends on / sequencing**: F-AUTH-001.

**Verification**: A service test for the first private resource asserts `not_found` for a non-member.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created.

---

### F-AUTH-008 State-changing API routes depend on cookie `SameSite` alone against cross-site requests

| Field | Value |
| --- | --- |
| Status | Draft |
| Severity | Low |
| Confidence | Low (the session cookie's attributes were not observed; the behaviour is INFER) |
| Timing | Trigger: the first real state-changing endpoint |
| Disposition | IMPROVE |
| Scope | WEB |
| Trigger class | Trigger-gated |
| Effort | S |

**Evidence**: `lib/api/handler.ts` authenticates, parses the body as JSON regardless of `Content-Type` (the RUN probe with `text/plain` reached the authentication step and returned 401, so the body type is not enforced), and has no `Origin` or `Sec-Fetch-Site` check (READ). Web authentication is a Clerk session cookie; whether it is `SameSite=Lax` was not observed (the one `Set-Cookie` seen in the handshake, `__clerk_redirect_count`, is `Lax`, and is a different cookie).

**Observation**: A cross-site form post can send a `text/plain` body that parses as JSON. With `SameSite=Lax` on the session cookie the browser does not attach it to a cross-site POST, so the attack fails; with a development-instance configuration, a satellite domain, or a later change to `SameSite=None`, it would not. The protection is real but sits in a setting this repository does not control or test.

**Consequence**: None while Clerk keeps `Lax`. A future cross-origin setup could silently open cross-site writes to the cookie-authenticated routes.

**Recommendation**: In the shared adapter, for unsafe methods authenticated by cookie (no `Authorization` header), reject requests whose `Origin` or `Sec-Fetch-Site` indicates a different site, and require `Content-Type: application/json` for body routes. Roughly ten lines plus tests, added when the first real write endpoint lands; bearer-token clients are unaffected.

**Alternatives and tradeoffs**: CSRF tokens (heavier, unnecessary with Origin checks). Rely on Clerk (the current state).

**Affects**: `lib/api/handler.ts`, `docs/api.md`, `docs/security.md`.

**Depends on / sequencing**: F-SEC-005 (headers) is separate; none blocking.

**Verification**: Tests: a cross-site `Origin` with a cookie is rejected; same-origin and bearer requests pass.

**Decisions needed**: none.

**Challenge log**: (Pass 4)

**History**: 2026-10-07 created.

---

### F-AUTH-009 The server authentication boundary fails closed, in code and in the deployed site

KEEP. Evidence: `lib/api/route.ts` and `lib/api/handler.ts` require a verified Clerk user ID before any service runs for `auth: "required"`; identity never comes from input (`ServiceContext` built from the verified ID; `proof-items.test.ts` and `route.test.ts` prove 401-first); `proxy.ts` plus the layouts give defence in depth for pages (C-41, C-08, `auth.test.ts`). RUN against Production: no credential, a malformed bearer, an empty bearer, a Basic scheme, a `text/plain` POST and a DELETE all return the generic 401 envelope with `Cache-Control: no-store` and no detail; protected pages hand a browser to Clerk's handshake; unknown API versions return the standard `not_found` envelope. Why it is sound: identity has one entry point (`lib/auth/server.ts`, `server-only`), errors are generic, and the API adapter is framework-free. Tripwire: a new route that reads identity from anywhere but `getUserId`, an `auth: "public"` route that returns user data, or a change that makes a layout trust `getUserId()` alone for a role.

---

### F-AUTH-010 The authorization primitives are small and deny by default; do not replace them with a framework

KEEP. Evidence: `lib/auth/authorize.ts` is 50 lines; `can` converts a throwing rule to a deny, `authorize` throws unless the result is strictly `true`, `isOwner` rejects empty owners; `auth.test.ts` covers allow, deny, missing owner, throwing rule, strict true, and composition; `proof-items.ts` re-scopes the delete to the owner so a race cannot remove another user's row. Why it is sound: it is the minimum structure the next rules (F-AUTH-001) need, and it is pure, so it runs on web and, through the service layer, for mobile. Tripwire: a rule library or decorator framework proposed before three distinct roles exist (L8); a rule that returns a truthy non-boolean.

---

## Reconciliation of prior inputs (AUTH)

| Input | Outcome |
| --- | --- |
| P-78-M10 privacy basics before collecting member data | Adopted → F-AUTH-003 |
| P-78-M13, P-CH-06 deny-by-default authorization test pattern and matrix | Adopted → F-AUTH-001 |
| P-78-M14 Clerk-to-database webhook handling | Adopted, modified → F-AUTH-002 (lazy creation preferred; one required webhook) |
| P-78-T01 audit log of privileged actions | Deferred → F-AUTH-004 |
| P-78-T11 retention and data-subject requests (AUTH part) | Adopted → F-AUTH-003 (data side stays F-DATA-009) |
| P-78-O05 privacy part (session replay, analytics) | Adopted → F-AUTH-003 point 2 |
| P-CH-05 threat and abuse modelling | Partly covered by F-AUTH-001, -004, -008 and the SEC findings; the formal model stays with Pass 3 scenarios |
| P-CH-07 data classification, lifecycle, privacy | Adopted → F-AUTH-003 |
| P-CH-33 legal and compliance triggers | Adopted → F-AUTH-003 (counsel review is the owner's action) |
| P-GAP-01 no real Clerk-authenticated mobile call | Adopted → F-AUTH-005 |
| P-RM-01 roles, organization managers, product schema (AUTH part) | Adopted → F-AUTH-001; product questions to Q-010 |
| P-NOTES-01 admin and moderator grant, anonymous submissions, moderation reversibility | Routed → Q-010; F-AUTH-001 (mechanism), F-AUTH-004 (accountability) |

Challenges to prior work: **C-08** (ledger) understated by one more fact: the layouts' `return null` is a blank page, not a redirect or not-found (F-AUTH-001). **The Playwright claim (C-51)** stands: the Clerk end-to-end spec exists, is not in CI, and was not run here. **Carry-forward from SEC and DATA** was absorbed as F-AUTH-001, -002, -003, -005, with no change in direction. No Fable or issue-78 finding was rejected; none was upgraded to High because no real user or data exists (U-07).

## Lens matrix

| Lens | Result |
| --- | --- |
| L1 Drift | F-AUTH-006 (the appendix); C-08 and C-50 confirmed. |
| L2 Enforcement | F-AUTH-001 (no machine proof that a route names a rule), F-AUTH-009, F-AUTH-010 (what is proven and bites). |
| L3 Adversary | F-AUTH-001 (any account reaches admin), F-AUTH-008 (cross-site writes), F-AUTH-009 (probe results). A compromised Clerk account or token revocation behaviour is not testable without credentials and is recorded as not examined. |
| L4 Failure and recovery | F-AUTH-002 (deleted-user and webhook replay). A Clerk outage fails closed (every protected call returns 401); examined, nothing material beyond that. |
| L5 Scale and cost | Examined, nothing material at the proof scale. Clerk plan limits (the development instance has a small user cap) and MAU cost are UNVERIFIED (U-18) and owned by OPS. |
| L6 Longevity | F-AUTH-002 (identity keys with no user table), F-AUTH-003 (deletion and export years later), F-AUTH-004 (attribution). |
| L7 Compatibility | F-AUTH-005 (one token path for web and mobile, unproven end to end); API contract is shared (ARCH). |
| L8 Simplicity | F-AUTH-010 (no RBAC framework, no Clerk Organizations); F-AUTH-002 prefers lazy creation over a webhook dependency. |
| L9 Boilerplate fit | F-AUTH-009 and -010 are inherited by every generated app and belong in every app; F-AUTH-001 (the admin allow-list rule) is generic enough to ship in the template; F-AUTH-002, -003, -004 and -008 are trigger-gated; F-AUTH-005 is a mobile-template concern. |

## Carry-forward to other subjects

* **REL**: Production runs a Clerk **development** instance with open sign-up and a development user cap; real production needs a custom domain and a Clerk production instance (deferred by the owner; no domain exists). Clerk allowed origins and redirect URLs per environment (U-11).
* **TEST**: the Clerk end-to-end spec is not in CI; a valid-token mobile test (F-AUTH-005); the authorization matrix and the static tripwire (F-AUTH-001); secret-bearing E2E needs a policy (C-51).
* **SEC**: the allow-list of admin Clerk IDs is a new server-only variable (credential lifecycle, F-SEC-007); response headers and rate limiting on sign-up and auth-adjacent routes stay with F-SEC-005 and F-SEC-006.
* **DATA**: `user_profile` and foreign-key design with the first domain schema (F-AUTH-002); deletion cascade policy (F-DATA-009); location precision (F-DATA-008, F-AUTH-003).
* **ARCH/REQ**: Q-009 and Q-010 are answered (2026-10-08); paid membership (payment provider, hosted checkout, tax, store in-app-purchase rules on mobile) is undesigned and is a new REQ/ARCH item; the not-found-versus-forbidden convention (F-AUTH-007) belongs in `docs/services.md`.
* **OPS**: Clerk plan limits and cost alerts (U-18); incident response for an account-takeover report; owner account security (U-16, single owner, Vercel 2FA indicator off).
* **BOIL**: whether the admin allow-list rule and the authorization matrix test ship in the template.
* **Platform facts still needed (yes/no or names only)**: Clerk sign-up restrictions and bot protection (U-11); MFA and session lifetime; allowed origins; any configured webhooks (expected none); whether a Clerk test user for E2E exists and where its credentials live (U-12).
