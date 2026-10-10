# S10 Payments: Plans, Switches and Entitlement

**Status: APPROVED by the owner on 2026-10-10 ("proceed build it", after choosing Stripe as the provider). This is the first of four payment slices (S10 here, then S11 Stripe test-mode checkout and webhooks, S12 coupons and trials through Stripe, S13 member and church screens).** Source: product plan sections B, D, E and the pricing votes; `/docs/payments.md` (rules). Nothing here takes real money: the provider in this slice is a fake.

## Purpose

Let the owner decide, from the admin console and without a code change, who pays, how much, for how long a free trial runs, and which promotional coupons exist, and have the server enforce it. Launching with everyone free must be one setting; turning payment on later must be another.

## Scope (in)

* Billing rules per account type (member, organization): a "payment required" setting, a free-trial length in days, and a default plan.
* Plans: a name, an account type, a billing interval (month or year) and a price as whole cents with a currency. A price change creates a new price version; existing subscribers keep theirs.
* Seeded proposals from the plan's votes (member: $3 per month and $30 per year; organization: free start), created **inactive** so nothing charges until the owner activates them.
* Subscription state per account (none, trialing, active, past due, cancelled) and a derived entitlement answer: "may this account use paid features?" computed on the server.
* Free trials: starting one is automatic when the rule has trial days, once per account per type, ending at an exact moment.
* Coupons: code, percent off or fixed amount off, optional expiry, optional maximum redemptions, active toggle, one use per account.
* An admin billing console and an audit log of every change.
* A `PaymentProvider` port with a fake adapter that backs all tests (`/docs/payments.md` rule 7).

## Out of scope

The real Stripe adapter, checkout pages, webhooks (S11); Stripe-side coupons and trials (S12); member and church payment screens (S13); taxes, invoices, refunds, disputes, grace periods, in-app store purchases, and deciding which features are paid (nothing is gated yet; this slice only provides the check).

## Acceptance criteria

* **AC1** Only an admin can read or change billing rules, plans and coupons; every other caller gets 403 (route-guard tests, each broken on purpose).
* **AC2** An admin can set, per account type, "payment required" (default off), trial days (0 to 365) and a default plan; the change takes effect on the next entitlement check.
* **AC3** With payment not required for an account type, every account of that type is entitled, and no provider call is made (the bypass is enforced on the server and cannot be requested by a client).
* **AC4** With payment required, an account is entitled only while its subscription is trialing or active; none, past due and cancelled are not entitled.
* **AC5** A trial starts automatically for an account of a type whose rule has trial days, at most once per account per type, and ends exactly trial-days later (fake-clock tests, including the boundary instant).
* **AC6** An admin can create, edit and deactivate plans; amounts are whole cents with a currency, validated (no fractions, no negatives, an upper bound); a price change creates a new price version and leaves existing subscribers on their old price.
* **AC7** The seeded proposals exist inactive; an inactive plan cannot be subscribed to.
* **AC8** An admin can create, edit and deactivate coupons; redemption is validated on the server (inactive, expired, over its limit, or already used by that account are rejected with distinct messages); the discounted price is computed in whole cents with a documented rounding rule and never goes below zero.
* **AC9** Every change to rules, plans and coupons writes an audit entry (who, when, what changed from and to); entries cannot be edited or deleted through the application; admins can read them.
* **AC10** `GET /api/v1/me/entitlements` returns the derived answer for the signed-in account; a client cannot supply or override it.
* **AC11** No payment provider SDK is imported outside the adapter folder, and a fake adapter backs the tests (guard test, broken on purpose).
* **AC12** Money is whole minor units plus an explicit currency in every contract; a contract test rejects a decimal amount.
* **AC13** Deleting an account removes its subscription and coupon-use records (extends the S1 deletion tests); audit entries keep only an anonymous admin reference.

## Controls inventory

| Control | Test id | Action | Effect |
| --- | --- | --- | --- |
| Billing tab in the admin console | `admin-billing-link` | Open | Billing page shown to admins only |
| Payment required checkbox (member, organization) | `billing-required-member`, `billing-required-organization` | Toggle | Rule saved; audit entry |
| Trial days input | `billing-trial-days-member`, `billing-trial-days-organization` | Enter | Validated 0 to 365; saved |
| Default plan select | `billing-default-plan-member`, `billing-default-plan-organization` | Choose | Saved |
| New plan, edit plan, activate or deactivate plan | `plan-new`, `plan-edit-N`, `plan-active-N` | Act | List updates; new price version on a price change |
| Plan name, interval, amount, currency fields | `plan-name`, `plan-interval`, `plan-amount`, `plan-currency` | Enter | Validation |
| New coupon, edit coupon, activate or deactivate coupon | `coupon-new`, `coupon-edit-N`, `coupon-active-N` | Act | List updates |
| Coupon fields (code, percent or amount, expiry, limit) | `coupon-code`, `coupon-percent`, `coupon-amount`, `coupon-expires`, `coupon-limit` | Enter | Validation |
| Audit log list | `billing-audit-list` | View | Newest first |

## Owner decisions still open

Final prices and trial lengths (votes in the product plan); whether members, churches or both pay at launch (the default is nobody); the length of a grace period for failed payments (S11); which features become paid.

## Done checklist

Each acceptance criterion and control above is ticked off with its test or manual step in the pull request that finishes the slice.
