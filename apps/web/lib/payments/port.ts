// The payment provider port (docs/payments.md rule 7). The application depends on THIS vocabulary, never on
// a provider's own types. One adapter folder is the only place a provider SDK may be imported (a guard test
// enforces it). The provider is the source of truth for payment state; the application stores only the
// provider's references and the state derived from it. No card data ever passes through this interface:
// card details are entered on the provider's own hosted pages.
export type StartSubscriptionInput = {
  accountType: string;
  accountId: string;
  priceId: string;
  /** Whole minor units (cents) the provider should charge each period, after any coupon. */
  amountMinor: number;
  currency: string;
  interval: string;
};

export type StartSubscriptionResult = { providerRef: string; status: "active" | "past_due" };

/** What is needed to open the provider's hosted checkout (S11). The amount comes from OUR plan, never from a client. */
export type CheckoutInput = {
  accountType: string;
  accountId: string;
  planId: string;
  priceId: string;
  planName: string;
  /** Whole minor units (cents) per period. */
  amountMinor: number;
  currency: string;
  interval: "month" | "year";
  successUrl: string;
  cancelUrl: string;
};
export type CheckoutResult = { url: string };

/** The provider's customer page, where a person changes their card or cancels (S11). */
export type PortalInput = { customerRef: string; returnUrl: string };
export type PortalResult = { url: string };

/**
 * What a verified provider notification means, in our words. `eventId` is the provider's own id (used to ignore
 * replays) and `at` is when the provider says it happened (used so an old event never overwrites a newer state).
 */
export type ProviderEvent =
  | { kind: "checkout_completed"; eventId: string; at: Date; accountType: string; accountId: string; planId: string; priceId: string; subscriptionRef: string; customerRef: string | null }
  | { kind: "subscription_active"; eventId: string; at: Date; subscriptionRef: string }
  | { kind: "payment_failed"; eventId: string; at: Date; subscriptionRef: string }
  | { kind: "subscription_cancelled"; eventId: string; at: Date; subscriptionRef: string }
  | { kind: "ignored"; eventId: string; at: Date; type: string };

/** Thrown when a notification's signature is missing, wrong, altered or too old. It never carries the payload. */
export class WebhookSignatureError extends Error {
  constructor() {
    super("The notification could not be verified");
    this.name = "WebhookSignatureError";
  }
}

export type PaymentProvider = {
  startSubscription(input: StartSubscriptionInput): Promise<StartSubscriptionResult>;
  cancelSubscription(providerRef: string): Promise<void>;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  createPortal(input: PortalInput): Promise<PortalResult>;
  /** Verifies the signature on the RAW body and returns what happened; throws WebhookSignatureError otherwise. */
  readWebhook(rawBody: string, signature: string | null): ProviderEvent;
};
