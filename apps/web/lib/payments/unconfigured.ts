import type { PaymentProvider } from "./port";

// Wired until a real provider is configured (S11). Any attempt to take a payment fails loudly, so nothing
// can grant paid access without a real provider confirming it.
export const unconfiguredPaymentProvider: PaymentProvider = {
  async startSubscription() {
    throw new Error("No payment provider is configured");
  },
  async cancelSubscription() {
    throw new Error("No payment provider is configured");
  },
};
