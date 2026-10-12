# S14 Church and ministry plans, and the first 50 free for life

**Status: APPROVED by the owner on 2026-10-12 ("go for it", "write the spec, and code from the spec"; the plan's vote: free to start, future paid church accounts at $3 a month or $30 a year, and the first 50 flagship churches or ministries free for life).** Fourth payment slice (S10 plans and switches, S11 Stripe checkout and webhooks, S13 member membership page and trial grants are built). Source: the product plan's revenue direction, `/docs/payments.md`.

## Purpose

Let an approved manager see and manage the plan of their church or ministry and, once payment is switched on for churches, buy one; and let an admin mark up to 50 flagship churches and ministries as free for life. Everything stays free until an admin switches "payment required" on for churches, so this earns nothing by itself.

## What already exists (not rebuilt)

Prices, trial length and the "who pays" switch for churches (the `organization` account type) are set in the admin console (S10). The payment provider port, the Stripe adapter and the webhook already take an account type and an account id (S11). Who is an approved manager of a church is decided by the organizations service (S2).

## Scope (in)

* **Church membership page** (`/manage/<church>/membership`, an approved manager): the church's plan in words (free for everyone right now; free trial with its end date; active; free for life as a flagship; payment late; cancelled; trial ended), the active church plans with prices and a **Choose this plan** button, and **Manage billing** for a church with a paying subscription. A link from the church's management page.
* **Church checkout and billing page APIs** (approved managers of that church and admins): `POST /api/v1/organizations/:id/checkout`, `POST /api/v1/organizations/:id/billing-portal`, `GET /api/v1/organizations/:id/entitlement`. The account paid for is the church, never the person; the price comes from our plan; only an active church plan can be bought.
* **Flagship free for life** (admin): `PUT /api/v1/admin/billing/flagship` with a church id, `enabled` (true or false) and a reason. Enabling gives the church an active subscription with no provider reference and no plan (so no payment event can change it). At most 50 churches can be flagship at once; the 51st is refused (409). Disabling returns the church to the normal rule. A form in the admin billing console shows how many of the 50 are used.

## Out of scope

Coupons at checkout; taxes, invoices and refunds; paid features for churches (nothing is gated yet; premium listing, analytics and promotion are later); selling inside the phone apps; switching to live keys; a church paid for by several managers (one subscription per church).

## Acceptance criteria

* **AC1** Only an approved manager of the church (or an admin) can open church checkout, the billing page or read the church's entitlement; another member, a pending or rejected claimant and a signed-out caller are refused (401, 404) and nothing is created.
* **AC2** Church checkout needs payments switched on, accepted terms and an **active organization plan**; a member plan, an inactive plan, an unknown or malformed id is "not found". The reply is only the hosted checkout's address, and the request to the provider carries the church as the account (not the person) and our plan's price.
* **AC3** A church that already has an active subscription (paid or flagship) gets 409 from checkout.
* **AC4** The billing page needs a church with a provider customer reference; anyone else is "not found".
* **AC5** The webhook applies an organization checkout to the church's subscription exactly as for a member (S11 rules: verified signature, repeat-safe, never backwards).
* **AC6** The church's entitlement is derived on the server from the organization rule and the church's subscription (including the one-time trial), never from anything a client sent.
* **AC7** Only an admin can mark a church flagship; anyone else gets 401 or 404.
* **AC8** Enabling flagship needs an approved church, an `enabled` flag and a non-empty reason; an unknown or unapproved church is "not found"; a church with a paying subscription (a provider reference) is refused (409) and left unchanged.
* **AC9** At most 50 churches are flagship at once: the 51st enable is refused (409) and changes nothing; a repeat enable of one that is already flagship is accepted and uses no extra place; disabling frees the place.
* **AC10** A flagship church is entitled whatever the organization rule says, and a provider notification can never change it.
* **AC11** Every flagship change writes an audit entry (actor, church, enabled, reason) in the same statement as the change.
* **AC12** The church membership page shows only what the server says; with payment not required for churches it says membership is free right now and shows no Choose button.

## Controls inventory

| Control | Test id | Action | Effect |
| --- | --- | --- | --- |
| Church membership status | `org-membership-status` | View | States the church's plan in words |
| Church plan item | `org-membership-plan-N` | View | Name, price and interval |
| Choose this plan (church) | `org-plan-choose-N` | Click | Opens hosted checkout for the church |
| Manage billing (church) | `org-membership-manage` | Click | Opens the provider's customer page |
| Church membership error | `org-membership-error` | View | Says what went wrong |
| Flagship: church id, reason | `flagship-org`, `flagship-reason` | Type | Fills the form |
| Flagship give and remove | `flagship-enable`, `flagship-disable` | Click | `PUT /admin/billing/flagship` |
| Flagship places used | `flagship-count` | View | "N of 50 used" |

## API

`POST /api/v1/organizations/:id/checkout`, `POST /api/v1/organizations/:id/billing-portal`, `GET /api/v1/organizations/:id/entitlement` (church managers and admins); `PUT /api/v1/admin/billing/flagship` body `{ organizationId, enabled, reason }`, reply `{ organizationId, enabled, used, limit }` (admin); `GET /api/v1/admin/billing/flagship` returns `{ used, limit }` (admin).

## Data

One new nullable column, `billing_subscription.flagship_slot` (a whole number from 1 to 50, unique), so the limit of 50 holds even if two admins act at the same moment. A flagship church is a `billing_subscription` row with account type `organization`, status `active`, no plan, no provider reference and a slot. Disabling deletes the row so the normal rule applies again. The number used is a count of slots. Each change goes in one statement with its audit entry.

## Hostile cases

A member or another church's manager calling church routes; a pending claimant; a member plan used for a church; double click on Choose; flagship over the limit under two simultaneous requests; enabling flagship on a paying church; a webhook trying to change a flagship church; an extra field in a body (`strict`).

## Owner decisions still open

Which church features are paid (nothing is gated yet; the plan lists featured placement, custom ministry page, analytics and event promotion); when to switch "payment required" on for churches.

## Done checklist

AC1 to AC12 and every control ticked, each with its test, in the pull request that finishes the slice.
