# S13 Membership screen and trial grants

**Status: APPROVED by the owner on 2026-10-12 ("go for it", "write the spec, and code from the spec"). Owner decisions that shaped it: prices per month and per year and the trial length are set in the admin console; an admin can give one customer another trial.** Third of the payment slices (S10 plans and switches, S11 Stripe checkout and webhooks, both built). Source: the product plan's revenue direction (paid member accounts, 30-day trial, $3 a month or $30 a year, all votes), `/docs/payments.md`.

## Purpose

Give a signed-in member one place to see their membership and act on it (start a plan, manage or cancel it), and give admins a way to hand one customer a fresh free trial. Everything stays free for everyone until an admin switches "payment required" on, so building this earns nothing by itself; it is what lets payment be switched on.

## What already exists (not rebuilt)

Prices per month and per year, the trial length (0 turns the trial off), the default plan and the "who pays" switch are set in the admin console (S10). A member's derived answer (`GET /api/v1/me/entitlements`), checkout and the provider's customer page are built (S11). This slice adds screens and the trial grant.

## Scope (in)

* **Membership page** (`/account/membership`, signed in): states the membership in words (free for everyone right now; free trial with its end date; active; payment late; cancelled; trial ended), lists the active member plans with their prices (per month, per year) and a **Choose this plan** button for each, and a **Manage billing** button (the provider's page to change a card or cancel) for someone who has a subscription with the provider. A link to it from the account page.
* **Trial grant** (admin): `PUT /api/v1/admin/billing/trials` with a member id, a number of days (1 to 365) and a reason. It sets that member's trial to end that many days from now, replacing any earlier trial end. It is refused (409) while the member has an active or late-paying subscription, and "not found" for a member that does not exist. It writes an audit entry with the reason. A form in the admin billing console.

## Out of scope

Church (organization) plans and checkout (next slice, S14: needs "who is allowed to buy for this church" and an organization checkout); coupons applied at Stripe checkout and Stripe-side trials; taxes, invoices, refunds; selling inside the phone apps; switching to live keys; deciding which features are paid (nothing is gated yet).

## Acceptance criteria

* **AC1** Only an admin can grant a trial; anyone else (signed out, a member) is refused exactly as for the other admin billing routes (401, 404).
* **AC2** A grant needs a member id, whole days from 1 to 365 and a non-empty reason; anything else is a field error (400) and changes nothing.
* **AC3** A grant for a member with no subscription creates a trialing subscription ending `days` from now; for a member whose trial is running or has ended, or whose subscription is cancelled, the trial end is replaced and the status is trialing.
* **AC4** A grant for a member with an active or past-due subscription is refused (409) and changes nothing.
* **AC5** A grant for an unknown member is "not found" and creates nothing.
* **AC6** Every grant writes an audit entry (actor, member, days, reason, time) in the same step as the change; a refused grant writes none.
* **AC7** After a grant, the member's entitlement shows trialing and entitled until the new end instant, and not entitled after it (when payment is required).
* **AC8** The Membership page shows only what the server says (entitlement and active plans); it never decides entitlement itself. With payment not required it says membership is free right now and shows no price pressure (no Choose button).
* **AC9** The Choose button opens the provider's hosted checkout via the existing route; the price is never sent from the browser.
* **AC10** Manage billing appears only for an active or late-paying subscription, and shows a clear message if the provider page cannot be opened.
* **AC11** A repeated click on Grant does not grant twice (the button is disabled while sending, and a repeat replaces the end date with the same result, adding no second audit-worthy change beyond its own entry).

## Controls inventory

| Control | Test id | Action | Effect |
| --- | --- | --- | --- |
| Membership status text | `membership-status` | View | States the membership in words |
| Plan list item | `membership-plan-N` | View | Name, price and interval |
| Choose this plan | `plan-choose-N` | Click | Opens hosted checkout (existing control) |
| Manage billing | `membership-manage` | Click | Opens the provider's customer page |
| Membership error | `membership-error` | View | Says what went wrong |
| Grant trial: member id, days, reason | `trial-grant-user`, `trial-grant-days`, `trial-grant-reason` | Type | Fills the form |
| Grant trial button | `trial-grant-submit` | Click | `PUT /admin/billing/trials` |

## API

`PUT /api/v1/admin/billing/trials` (admin) body `{ userId, days, reason }`, reply `Entitlement`-shaped `{ accountType, entitled, reason, status, trialEndsAt }`. No other route is added.

## Data

No new table or column. A grant writes the existing `billing_subscription` row and `audit_log`. Contains the member's sign-in id, already held (T1).

## Hostile cases

A member calling the admin route; an id for someone who does not exist; negative, zero, fractional or huge days; a missing reason; granting to someone who has paid; double submit; an extra field in the body (`strict`).

## Owner decisions still open

Which features paid members get (nothing is gated yet); church pricing and the first-50-free rule (S14); when to switch "payment required" on.

## Done checklist

AC1 to AC11 and every control ticked, each with its test, in the pull request that finishes the slice.
