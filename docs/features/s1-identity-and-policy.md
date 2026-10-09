# S1 Identity and Policy

**Status: DRAFT, not approved.** Source: blueprint slice S1; `/docs/auth.md` section 19 (account lifecycle), `/docs/risk-and-legal.md` (collection gate), `/docs/secure-coding.md`. Depends on: S0; terms and privacy text approved by the owner (generic now, attorney review before launch).

## Purpose

Make it lawful and safe to hold real accounts: record age and policy acceptance, give each person an application profile, and let them export and delete their data. This slice opens the **collection gate**: no real user data is collected before it is done.

## Scope (in)

* `UserProfile` created on first sign-in (webhook and lazy create), linked to the Clerk user id.
* Sign-up flow requires: age 18 or older (self-attested checkbox), acceptance of the current Terms and Privacy Policy; the accepted policy version and time are recorded (`PolicyAcceptance`).
* Public pages: Terms, Privacy (with the attendee privacy promise in one paragraph), About, Contact for takedown or privacy requests.
* Account page: view profile, change display name, notification email preference, **export my data** (JSON), **delete my account**.
* Clerk webhook `POST /api/v1/webhooks/clerk` (signature verified) for user updated and deleted.
* Removal of S0's `hello_note`.
* Server-side private analytics only (counts of page and event views, no user ids, no third-party SDK) behind a port; no session replay.
* Error tracking and log redaction port with a no-op adapter until a vendor is chosen (owner approves vendor).

## Out of scope

Roles for Church/Ministry managers (S2), notification preferences by place (S7), payments, any marketing email.

## User flow

Sign up, tick age and policy boxes, create the account; first sign-in creates the profile; later policy versions force a re-accept before use; the account page offers export and delete; deletion confirms by typing the word DELETE, removes the profile and all member-owned rows, and signs out.

## Acceptance criteria

* **AC1** Sign-up cannot complete without the age and policy boxes; the record stores version and time.
* **AC2** A new policy version blocks protected pages until re-accepted.
* **AC3** `GET /me` returns only the caller's profile; `PATCH /me` changes only allowed fields (display name, email preference); other fields are rejected.
* **AC4** `GET /me/export` returns every row owned by the caller across all tables, and nothing of anyone else's; a test fails if a new member-owned table is not included.
* **AC5** `DELETE /me` removes or anonymizes everything per `/docs/data-inventory.md`, then removes the Clerk user; afterward the id returns `401` and no member-owned rows remain.
* **AC6** The Clerk webhook rejects a missing or bad signature and replays of old timestamps; a delete event removes the profile.
* **AC7** Display name is plain text, 1 to 60 characters, no control characters.
* **AC8** The analytics port records counts with no user identifier; a guard fails if an identifier field is added.
* **AC9** No server error response exposes internals; logs redact emails, tokens and phone numbers (test with seeded values).
* **AC10** Terms, Privacy, About and Contact are public, linked in the footer, and pass the accessibility scan.
* **AC11** Every table added has a data-inventory row (tier, retention, deletion path); the inventory test passes.

## Controls inventory

| Screen | Control | Test id | Action | Effect |
| --- | --- | --- | --- | --- |
| Sign up | Age checkbox | `signup-age-checkbox` | Attest 18+ | Required to continue |
| Sign up | Policy checkbox | `signup-policy-checkbox` | Accept terms and privacy | Required to continue; links open pages |
| Re-accept dialog | Accept button | `policy-accept-button` | Record new version | Unblocks the app |
| Account | Display name input, Save | `account-name-input`, `account-name-save` | `PATCH /me` | Saved value shown |
| Account | Email preference toggle | `account-email-toggle` | `PATCH /me` | Persists |
| Account | Export button | `account-export-button` | `GET /me/export` | Downloads JSON |
| Account | Delete button, confirm input, confirm button | `account-delete-button`, `account-delete-confirm-input`, `account-delete-confirm-button` | `DELETE /me` | Account removed; signed out |
| Footer | Terms, Privacy, About, Contact links | `footer-terms`, `footer-privacy`, `footer-about`, `footer-contact` | Navigate | Pages render |

## API

`GET/PATCH/DELETE /me`, `POST /me/policy-acceptance`, `GET /me/export`, `POST /webhooks/clerk`. All through `apiRoute`; member auth except the webhook (signature) and the public pages.

## Data

`user_profile(id, clerk_user_id unique, display_name, email_pref, created_at)` T2; `policy_acceptance(user_id, policy_kind, version, accepted_at)` T2, kept for the legal period and anonymized on deletion; `hello_note` dropped. Migration is forward-only.

## Hostile cases

Skipping the checkboxes by direct API call, editing another user's profile, mass-assignment of `role`, forged webhook, replayed webhook, oversized and malformed bodies, delete without confirmation, double-delete, export under load.

## Automation shipped with the slice

Schema and API tests with all hostile cases; webhook signature tests; export-completeness guard; deletion test against a seeded database; redaction test; analytics no-identifier guard; E2E (sign up, accept, edit, export, delete); accessibility scan on the public pages; mutation proofs.

## Owner decisions

Terms and Privacy text (assistant drafts a generic version; attorney review before launch, `/docs/risk-and-legal.md`); error-tracking vendor (options and cost brought first); data retention period for policy acceptance records.

## Done checklist

AC1 to AC11 and every control ticked with its proof; collection gate items in `/docs/risk-and-legal.md` marked; `pnpm validate` clean; CI green; docs updated.
