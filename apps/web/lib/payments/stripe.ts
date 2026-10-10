import Stripe from "stripe";

import { WebhookSignatureError, type CheckoutInput, type PaymentProvider, type ProviderEvent } from "./port";

// Stripe adapter for the payment port (S11). This is the ONLY file that imports the Stripe SDK (a guard test
// keeps it that way), so another provider can replace it without touching any caller. Rules it follows
// (docs/payments.md): hosted checkout only (card details are entered on Stripe's page and never reach us), the
// provider is the source of truth for payment state, the signature of every notification is verified on the RAW
// body, and Stripe's types never leave this file: everything is translated into the port's own words.
type StripeObject = Record<string, unknown>;
type StripeEventLike = { id: string; type: string; created: number; data: { object: StripeObject } };
export type StripeLike = {
  checkout: { sessions: { create(params: StripeObject): Promise<{ id: string; url: string | null }> } };
  billingPortal: { sessions: { create(params: StripeObject): Promise<{ url: string }> } };
  webhooks: { constructEvent(payload: string, header: string, secret: string): StripeEventLike };
};

export type StripePaymentOptions = { secretKey: string; webhookSecret: string; client?: StripeLike };

const text = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);
/** Stripe sometimes sends a reference as an id and sometimes as an expanded object with an id. */
const refOf = (value: unknown): string | null => text(value) ?? (typeof value === "object" && value !== null ? text((value as StripeObject).id) : null);

/** Turns a verified Stripe event into what it means for us. Anything we do not act on is "ignored". */
export function translateStripeEvent(event: StripeEventLike): ProviderEvent {
  const at = new Date(event.created * 1000);
  const base = { eventId: event.id, at };
  const object = event.data.object;
  switch (event.type) {
    case "checkout.session.completed": {
      const metadata = (object.metadata ?? {}) as Record<string, unknown>;
      const subscriptionRef = refOf(object.subscription);
      const accountType = text(metadata.accountType);
      const accountId = text(metadata.accountId);
      const planId = text(metadata.planId);
      const priceId = text(metadata.priceId);
      if (object.mode !== "subscription" || !subscriptionRef || !accountType || !accountId || !planId || !priceId) return { kind: "ignored", ...base, type: event.type };
      return { kind: "checkout_completed", ...base, accountType, accountId, planId, priceId, subscriptionRef, customerRef: refOf(object.customer) };
    }
    case "customer.subscription.updated": {
      const subscriptionRef = text(object.id);
      if (!subscriptionRef) break;
      const status = text(object.status);
      if (status === "active" || status === "trialing") return { kind: "subscription_active", ...base, subscriptionRef };
      if (status === "past_due" || status === "unpaid") return { kind: "payment_failed", ...base, subscriptionRef };
      if (status === "canceled") return { kind: "subscription_cancelled", ...base, subscriptionRef };
      break;
    }
    case "customer.subscription.deleted": {
      const subscriptionRef = text(object.id);
      if (subscriptionRef) return { kind: "subscription_cancelled", ...base, subscriptionRef };
      break;
    }
    case "invoice.payment_failed": {
      const parent = (object.parent ?? {}) as StripeObject;
      const details = (parent.subscription_details ?? {}) as StripeObject;
      const subscriptionRef = refOf(object.subscription) ?? refOf(details.subscription);
      if (subscriptionRef) return { kind: "payment_failed", ...base, subscriptionRef };
      break;
    }
  }
  return { kind: "ignored", ...base, type: event.type };
}

const metadataOf = (input: CheckoutInput) => ({ accountType: input.accountType, accountId: input.accountId, planId: input.planId, priceId: input.priceId });

export function createStripePayments({ secretKey, webhookSecret, client = new Stripe(secretKey) as unknown as StripeLike }: StripePaymentOptions): PaymentProvider {
  return {
    async startSubscription() {
      throw new Error("Stripe subscriptions start from hosted checkout, not from the server");
    },
    async cancelSubscription() {
      throw new Error("Stripe subscriptions are cancelled by the person on Stripe's customer page");
    },
    async createCheckout(input) {
      const session = await client.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ quantity: 1, price_data: { currency: input.currency, unit_amount: input.amountMinor, recurring: { interval: input.interval }, product_data: { name: input.planName } } }],
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        client_reference_id: `${input.accountType}:${input.accountId}`,
        metadata: metadataOf(input),
        subscription_data: { metadata: metadataOf(input) },
      });
      if (!session.url) throw new Error("The payment provider did not return a checkout address");
      return { url: session.url };
    },
    async createPortal({ customerRef, returnUrl }) {
      const session = await client.billingPortal.sessions.create({ customer: customerRef, return_url: returnUrl });
      return { url: session.url };
    },
    readWebhook(rawBody, signature) {
      if (!signature) throw new WebhookSignatureError();
      let event: StripeEventLike;
      try {
        event = client.webhooks.constructEvent(rawBody, signature, webhookSecret);
      } catch {
        throw new WebhookSignatureError(); // wrong, altered or stale: never say which, never echo the payload
      }
      return translateStripeEvent(event);
    },
  };
}
