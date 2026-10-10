import Stripe from "stripe";
import { describe, expect, it, vi } from "vitest";

import { WebhookSignatureError } from "./port";
import { createStripePayments, translateStripeEvent, type StripeLike } from "./stripe";

// S11 AC3, AC5 and AC7 at the adapter. No network and no Stripe account: signatures are made and checked with
// Stripe's own offline helpers (so the real verification code runs), and checkout calls go to a fake client.
// Fake key values are built at runtime so no key-shaped text sits in the repository.
const secretKey = ["sk", "test", "A".repeat(24)].join("_");
const webhookSecret = ["whsec", "B".repeat(24)].join("_");
const signer = new Stripe(secretKey);
const sign = (payload: string, over: { secret?: string; timestamp?: number } = {}) => signer.webhooks.generateTestHeaderString({ payload, secret: over.secret ?? webhookSecret, timestamp: over.timestamp });
const now = () => Math.floor(Date.now() / 1000);

const eventBody = (type: string, object: Record<string, unknown>, created = now()) => JSON.stringify({ id: `evt_${type.replace(/\W/g, "_")}`, object: "event", type, created, data: { object } });
const completed = { mode: "subscription", subscription: "sub_123", customer: "cus_456", metadata: { accountType: "member", accountId: "user_abc", planId: "11111111-1111-4111-8111-111111111111", priceId: "22222222-2222-4222-8222-222222222222" } };

describe("Stripe webhook verification (real signature code, offline)", () => {
  const provider = createStripePayments({ secretKey, webhookSecret });

  it("AC5 a correctly signed body is accepted and understood", () => {
    const body = eventBody("checkout.session.completed", completed);
    expect(provider.readWebhook(body, sign(body))).toMatchObject({ kind: "checkout_completed", subscriptionRef: "sub_123", customerRef: "cus_456", accountId: "user_abc" });
  });

  it("AC5 a missing, wrong, altered or stale signature is refused", () => {
    const body = eventBody("customer.subscription.deleted", { id: "sub_123" });
    const refused = (signature: string | null, payload = body) => {
      try {
        provider.readWebhook(payload, signature);
        return null;
      } catch (error) {
        return error;
      }
    };
    expect(refused(null)).toBeInstanceOf(WebhookSignatureError);
    expect(refused("")).toBeInstanceOf(WebhookSignatureError);
    expect(refused("t=1,v1=abc")).toBeInstanceOf(WebhookSignatureError);
    expect(refused(sign(body, { secret: ["whsec", "Z".repeat(24)].join("_") }))).toBeInstanceOf(WebhookSignatureError); // signed with another secret
    expect(refused(sign(body), `${body} `)).toBeInstanceOf(WebhookSignatureError); // the body was altered after signing
    expect(refused(sign(body, { timestamp: now() - 3600 }))).toBeInstanceOf(WebhookSignatureError); // an hour old: a replay
    const error = refused(null) as Error;
    expect(error.message).not.toContain("sub_123"); // the payload never appears in the error
  });
});

describe("Stripe event meaning", () => {
  const at = now();
  const event = (type: string, object: Record<string, unknown>) => ({ id: "evt_1", type, created: at, data: { object } });

  it("AC7 checkout completed carries our references; without them it is ignored", () => {
    expect(translateStripeEvent(event("checkout.session.completed", completed))).toMatchObject({ kind: "checkout_completed", eventId: "evt_1", at: new Date(at * 1000), planId: completed.metadata.planId, priceId: completed.metadata.priceId });
    for (const broken of [{ ...completed, mode: "payment" }, { ...completed, subscription: null }, { ...completed, metadata: {} }, { ...completed, metadata: { ...completed.metadata, accountId: "" } }]) {
      expect(translateStripeEvent(event("checkout.session.completed", broken)).kind).toBe("ignored");
    }
    expect(translateStripeEvent(event("checkout.session.completed", { ...completed, subscription: { id: "sub_9" } }))).toMatchObject({ subscriptionRef: "sub_9" }); // an expanded reference works too
  });

  it("AC7 subscription changes map to active, past due and cancelled", () => {
    const kind = (type: string, object: Record<string, unknown>) => translateStripeEvent(event(type, object)).kind;
    expect(kind("customer.subscription.updated", { id: "sub_1", status: "active" })).toBe("subscription_active");
    expect(kind("customer.subscription.updated", { id: "sub_1", status: "trialing" })).toBe("subscription_active");
    expect(kind("customer.subscription.updated", { id: "sub_1", status: "past_due" })).toBe("payment_failed");
    expect(kind("customer.subscription.updated", { id: "sub_1", status: "unpaid" })).toBe("payment_failed");
    expect(kind("customer.subscription.updated", { id: "sub_1", status: "canceled" })).toBe("subscription_cancelled");
    expect(kind("customer.subscription.updated", { id: "sub_1", status: "incomplete" })).toBe("ignored");
    expect(kind("customer.subscription.deleted", { id: "sub_1" })).toBe("subscription_cancelled");
    expect(kind("invoice.payment_failed", { subscription: "sub_1" })).toBe("payment_failed");
    expect(kind("invoice.payment_failed", { parent: { subscription_details: { subscription: "sub_2" } } })).toBe("payment_failed"); // the newer shape
    expect(kind("invoice.payment_failed", {})).toBe("ignored");
  });

  it("AC7 an event type we do not act on is ignored, never an error", () => {
    expect(translateStripeEvent(event("customer.created", { id: "cus_1" }))).toMatchObject({ kind: "ignored", type: "customer.created" });
  });
});

describe("Stripe checkout request", () => {
  const input = { accountType: "member", accountId: "user_abc", planId: "p1", priceId: "pr1", planName: "Member, monthly", amountMinor: 300, currency: "usd", interval: "month" as const, successUrl: "https://example.test/services?checkout=success", cancelUrl: "https://example.test/services" };

  it("AC3 sends our price in whole cents, the account in metadata and our own return addresses", async () => {
    const create = vi.fn(async () => ({ id: "cs_1", url: "https://checkout.stripe.example/cs_1" }));
    const client = { checkout: { sessions: { create } }, billingPortal: { sessions: { create: vi.fn() } }, webhooks: { constructEvent: vi.fn() } } as unknown as StripeLike;
    const result = await createStripePayments({ secretKey, webhookSecret, client }).createCheckout(input);
    expect(result).toEqual({ url: "https://checkout.stripe.example/cs_1" });
    expect(create).toHaveBeenCalledTimes(1);
    const params = (create.mock.calls[0] as unknown as [Record<string, unknown>])[0];
    expect(params).toMatchObject({
      mode: "subscription",
      line_items: [{ quantity: 1, price_data: { currency: "usd", unit_amount: 300, recurring: { interval: "month" }, product_data: { name: "Member, monthly" } } }],
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: "member:user_abc",
      metadata: { accountType: "member", accountId: "user_abc", planId: "p1", priceId: "pr1" },
      subscription_data: { metadata: { accountType: "member", accountId: "user_abc", planId: "p1", priceId: "pr1" } },
    });
    expect(Number.isInteger((params.line_items as { price_data: { unit_amount: number } }[])[0].price_data.unit_amount)).toBe(true);
  });

  it("AC3 refuses to hand back a checkout with no address, and opens the customer page for a known customer", async () => {
    const noUrl = { checkout: { sessions: { create: vi.fn(async () => ({ id: "cs_2", url: null })) } }, billingPortal: { sessions: { create: vi.fn(async () => ({ url: "https://portal.stripe.example/p" })) } }, webhooks: { constructEvent: vi.fn() } } as unknown as StripeLike;
    const provider = createStripePayments({ secretKey, webhookSecret, client: noUrl });
    await expect(provider.createCheckout(input)).rejects.toThrow(/did not return a checkout address/);
    await expect(provider.createPortal({ customerRef: "cus_1", returnUrl: "https://example.test/account" })).resolves.toEqual({ url: "https://portal.stripe.example/p" });
  });
});
