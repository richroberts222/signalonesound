# S11 Payments: Stripe Checkout and Webhooks (test mode)

**Status: APPROVED by the owner on 2026-10-10 ("proceed build it, you have permission for each aspect", Stripe chosen as the provider).** Second of the four payment slices (S10 plans, switches and entitlement is built; S12 coupons and trials through Stripe; S13 the member and church screens). Source: `/docs/payments.md` (rules 1 to 10) and the product plan's revenue direction. **Test mode only: no real money moves, and nothing is charged until the legal gates in `/docs/risk-and-legal.md` are met and the owner switches to live keys.**

## Purpose

Let a signed-in member buy an active plan on Stripe's own hosted page (card details never touch our servers), and let Stripe tell our server, through a verified and repeat-safe webhook, whether the subscription is active, late or cancelled, so the server derives access from it.

## Scope (in)

* The `PaymentProvider` port gains `createCheckout`, `createPortal` and `readWebhook` (in our own words, never Stripe's types); a fake adapter backs the tests.
* A Stripe adapter (`lib/payments/stripe.ts`), the only file that imports the Stripe SDK. Checkout uses an inline price built from our plan (amount in whole cents, currency, month or year), so no Stripe-side catalog is needed.
* `POST /api/v1/me/checkout` (signed in, terms accepted) returns the address of Stripe's hosted checkout for an **active member plan**; `POST /api/v1/me/billing-portal` returns the address of Stripe's customer page (change card, cancel) for someone who has a subscription.
* `POST /api/v1/webhooks/stripe`: verifies Stripe's signature on the raw body, stores each event id so a replay is ignored, and updates the subscription (active, past due, cancelled) by Stripe's own reference.
* Settings `PAYMENTS_PROVIDER` (`stripe` or `none`, default `none`), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. A live key is refused outside production.
* Plan buttons on the Services page for active member plans (a minimal path; the full screens are S13).

## Out of scope

Coupons and free trials through Stripe (S12); church (organization) checkout; the member and church plan screens (S13); taxes, invoices, refunds, disputes, grace periods; selling inside the phone apps; switching to live keys.

## Acceptance criteria

* **AC1** With no provider chosen (the default), checkout and the portal answer "not found" and the webhook refuses; nothing calls Stripe.
* **AC2** Checkout needs a signed-in member who has accepted the terms (401 and 403 otherwise) and an **active member plan**; an inactive, unknown, malformed or organization plan is "not found". The reply is only the hosted checkout's address.
* **AC3** The checkout request sent to the provider carries our plan's price in whole cents with its currency and interval, the account reference in metadata, and success and cancel addresses on our own site; a client cannot choose the amount.
* **AC4** The portal needs a subscription with a provider customer reference; anyone else is "not found".
* **AC5** The webhook verifies the signature on the raw body: a missing, wrong, altered or stale signature is refused (400) and changes nothing.
* **AC6** A verified event is applied once: replaying the same event id changes nothing and still answers 200; events arriving out of order never move a subscription backwards.
* **AC7** `checkout completed` makes the member's subscription active with Stripe's references; `payment failed` makes it past due; `subscription cancelled` makes it cancelled; each by Stripe's own reference, never by anything the browser sent. Unknown event types answer 200 and change nothing.
* **AC8** Entitlement follows the stored state: after an active webhook a member with "payment required" on is entitled, after cancelled or past due they are not (S10 AC4).
* **AC9** Settings: `PAYMENTS_PROVIDER=stripe` requires both Stripe values; a live secret key is refused outside production; messages name the setting and never echo a value.
* **AC10** No Stripe SDK import exists outside `lib/payments` (the S10 guard, broken on purpose again) and the webhook route reads the raw body.
* **AC11** Deleting an account removes the member's subscription and customer reference (extends S10 AC13); stored event ids hold no personal data.

## Controls inventory

| Control | Test id | Action | Effect |
| --- | --- | --- | --- |
| Choose plan button on a plan (Services page) | `plan-choose-N` | Click | Signed out: sign in first. Signed in: opens Stripe's hosted checkout |
| Checkout error message | `plan-choose-error` | View | Says what went wrong, in words |

## Owner decisions still open

Switching from test to live keys (needs the legal gates, a business entity and tax decisions); church pricing.

## Done checklist

Each acceptance criterion and control above is ticked off with its test in the pull request that finishes the slice.
