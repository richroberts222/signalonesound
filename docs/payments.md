# Payments and Subscriptions

Rules for taking money. **Provider chosen: Stripe, in test mode only (owner decision 2026-10-10). Built so far: plans, switches and entitlement (S10), and hosted checkout, the customer page and verified webhooks (S11), all in test mode.** The owner expects members to pay (tentative; pricing and tiers are undecided, `/docs/product/product-plan.md`). Every vendor choice here is UNDECIDED and needs the owner's approval before any spending.

**Standards followed** (established practice; confirm before citing externally): PCI DSS (scope minimization through hosted checkout), OWASP ASVS V13 and API security for webhooks, idempotent processing, and the Apple and Google in-app purchase policies (verify the current text at design time).

## 1. Decisions needed before any payment work

| Decision | Options | Notes |
| --- | --- | --- |
| Payment provider | A hosted-checkout provider (Stripe is the common choice); others exist | **DECIDED 2026-10-10: Stripe**, test mode only until the legal gates in `/docs/risk-and-legal.md` are met. No real money or real customer data before then |
| Tiers and pricing | The plan's pricing items are marked UNDECIDED/VOTE (K section); the owner leans toward paid members | UNDECIDED |
| Who pays, and where | Members pay for access; Church/Ministry accounts pricing separate | UNDECIDED |
| Selling inside the apps | Apple and Google require their own in-app purchase system for digital subscriptions sold inside the iPhone and Android apps and take a share. Rules for linking out to web payment vary by region and change; **verify before designing** | A pricing and product-shape decision, not only a technical one |
| In-app purchase tooling | Handle the stores' purchases directly, or use a subscription service that wraps them | UNDECIDED; paid service, ask first |

## 2. Rules

1. **Hosted checkout only.** Card details are entered on the provider's page or components; they never reach our servers, database or logs. This keeps PCI scope minimal.
2. **The provider is the source of truth for payment state.** Our database stores references (provider customer and subscription ids) and the derived entitlement, never card data.
3. **Entitlement is derived on the server.** Access to paid features is checked on the server from the stored subscription state, never from a client claim.
4. **Webhooks are verified and idempotent.** Verify the provider's signature on every webhook; store the event id and ignore replays; process in a way that is safe to repeat; return quickly and do the work after recording the event.
5. **Money is an integer in minor units with an explicit currency.** Never floating point. (The convention is part of the pending platform conventions, F-ARCH-001, decided before the first table that holds an amount.)
6. **Test mode and live mode are separate, per environment.** Live provider keys are refused outside `prod`, like live Clerk keys (`/docs/environment.md`; extend the guard in the same pull request that adds the provider).
7. **A payment port.** The application depends on a `PaymentProvider` port written in our vocabulary; one adapter folder is the only importer of the provider SDK (`/docs/code-quality.md` section 12). A fake adapter backs the tests.
8. **Failure is designed.** Failed payments, retries, grace periods, cancellation, refunds and disputes each have a defined behavior and a customer-visible message. A provider outage must not lock existing paying members out.
9. **Receipts, tax and refunds** follow the provider's tooling; sales-tax collection is an owner and accountant decision.
10. **Store purchases are validated on the server** (receipt or notification verification) before granting entitlement; the app never grants itself access.

## 3. Testing

* Unit and service tests with the fake provider cover entitlement from subscription state, including expired, cancelled, past-due and refunded.
* Webhook tests cover a valid signature, an invalid signature (rejected), a replayed event (ignored) and an out-of-order event.
* Provider test mode with test cards in the integration job; never a real card.
* Each rule above that is a guard (live key refusal, signature check) gets a break-it check when built.

## 4. Enforcement and proof status

| Rule | Mechanism | Proof |
| --- | --- | --- |
| No secrets in committed files | `security.test.ts` | Proven |
| Live keys refused outside prod | Extend `parseServerEnv` and its test when a provider is added | Pattern proven for Clerk keys; the payment key guard is not yet built |
| Everything else in section 2 | Not built | Not proven; applies when payments are designed |
