// The payment provider port (docs/payments.md rule 7). The application depends on THIS vocabulary, never on
// a provider's own types. One adapter folder is the only place a provider SDK may be imported (a guard test
// enforces it). The provider is the source of truth for payment state; the application stores only the
// provider's reference and the state derived from it. No card data ever passes through this interface.
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

export type PaymentProvider = {
  startSubscription(input: StartSubscriptionInput): Promise<StartSubscriptionResult>;
  cancelSubscription(providerRef: string): Promise<void>;
};
