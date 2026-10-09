# S0 Walking Skeleton

**Status: DRAFT, not approved. Authorizes nothing until the owner approves the issue.** Source: `/docs/product/blueprint.md` slice S0; `/docs/product/product-plan.md` (Phase 1 minimum scope, mobile and web together). Depends on: Wave 0 (owner: lift the app-code pause; Expo account and `eas login`).

## Purpose

Prove the whole platform works end to end on the smallest real feature before any product feature is built: a signed-in person on **web and on a physical phone** calls the **shared API**, which writes and reads one record in the **database**, with the test conventions, the contracts and the pipeline all in place. Every later slice copies this pattern.

## Scope (in)

* Mobile app shell (Expo, expo-router) with Clerk sign-in on a physical iPhone and Android phone via an EAS development build; the bearer token is sent to the API.
* One shared endpoint pair, `GET /api/v1/me/hello` and `PUT /api/v1/me/hello`, storing a short greeting note for the signed-in user (`HelloNote`, a throwaway record; removed in S1).
* Shared contract and validation in `packages/shared` and `packages/validation`; compatibility snapshot updated.
* The same screen on web (replacing the proof slice page) and on mobile, with the shared test-id convention (`/docs/ui.md` section 9b).
* Mobile tests in CI (typecheck, unit); an E2E smoke on web.
* Documentation of how to run each client (`/docs/mobile.md`, `/docs/testing.md`).

## Out of scope

Real product features, store submission, push notifications, maps, production Clerk and domain, anything in S1 to S9.

## User flow

1. The person opens the web app or the mobile app and signs in with Clerk.
2. The screen shows their saved greeting note, or an empty state.
3. They type a note (up to 140 characters) and save; the saved note reappears after reload and on the other client.
4. They sign out; the note is no longer shown and the API refuses unauthenticated requests.

## Acceptance criteria

* **AC1** A signed-in web user can save a note and see it after reload.
* **AC2** A signed-in mobile user (physical device, development build) can save a note, and the same note appears on web.
* **AC3** `GET`/`PUT /me/hello` return `401` with no token or an invalid token, on both clients' tokens (cookie session and bearer).
* **AC4** A user can never read or write another user's note, including by changing an id in the request.
* **AC5** The note is trimmed, limited to 140 characters, and rejects control characters, HTML is stored and rendered as plain text, and unknown fields are rejected.
* **AC6** The response uses the standard envelope and safe errors (no stack, no internals); the contract snapshot test covers both operations.
* **AC7** The record is listed in `/docs/data-inventory.md` with tier T2, retention and deletion path, and a migration creates it forward-only.
* **AC8** Sign-out clears the client session on both clients.
* **AC9** The mobile app uses only public configuration values; a guard fails if a server secret name appears in mobile code.
* **AC10** CI runs the mobile typecheck and unit tests, and the pipeline still passes `Template proof`.

## Controls inventory

| Screen | Control | Test id | Action | Effect to check |
| --- | --- | --- | --- | --- |
| Sign in | Sign-in form (Clerk) | `signin-form` | Authenticate | Lands on the hello screen |
| Hello | Note input | `hello-note-input` | Type | Counter shows remaining characters; 141st character blocked |
| Hello | Save button | `hello-save-button` | `PUT /me/hello` | Success message; value persists |
| Hello | Saved note | `hello-note-display` | Display | Shows saved text as plain text |
| Hello | Error message | `hello-error` | Display | Safe message on failure |
| Header | Sign-out button | `signout-button` | End session | Returns to sign-in |

## API

| Operation | Auth | Request | Response | Errors |
| --- | --- | --- | --- | --- |
| `GET /api/v1/me/hello` | Member | none | `{ note: string or null }` | 401 |
| `PUT /api/v1/me/hello` | Member | `{ note: string (0 to 140) }` | `{ note }` | 400 validation, 401, 413, 429 |

## Data (database checkpoint summary)

`hello_note(user_id, note, updated_at)`; one row per user (unique `user_id`); owned by the user; T2; deleted with the account (S1 adds the cascade); throwaway, dropped by an S1 migration.

## Hostile cases (tested)

Changed or missing id, extra fields, 141 characters, a 4-byte emoji body at the size cap, script and markup strings, null bytes, invalid JSON, wrong content type, expired token, burst requests.

## Automation shipped with the slice

Unit tests for the schema; API tests for both operations including all hostile cases; the per-handler conformance test; web E2E (sign-in, save, reload); mobile unit tests; contract snapshot; a mutation proof for each guard added (break it, see it fail, restore).

## Owner decisions and approvals

Lift the app-code pause; create the Expo account and run `eas login`; confirm Q-005 (mock code survival) before the mocks are re-wired in S3. No spending: free tiers only. Q-011 (app name and store identity) is not needed until S5 testers.

## Done checklist

Tick each AC1 to AC10 and each control with its test or manual step; `pnpm validate` clean; CI green; Preview reviewed; docs updated; known limits recorded.
