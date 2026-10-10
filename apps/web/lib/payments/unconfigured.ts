import { WebhookSignatureError, type PaymentProvider } from "./port";

// Wired until a real provider is configured (PAYMENTS_PROVIDER=stripe). Any attempt to take a payment fails
// loudly, and every webhook is refused, so nothing can grant paid access without a real provider confirming it.
const notConfigured = (): never => {
  throw new Error("No payment provider is configured");
};

export const unconfiguredPaymentProvider: PaymentProvider = {
  async startSubscription() {
    return notConfigured();
  },
  async cancelSubscription() {
    return notConfigured();
  },
  async createCheckout() {
    return notConfigured();
  },
  async createPortal() {
    return notConfigured();
  },
  readWebhook() {
    throw new WebhookSignatureError();
  },
};
