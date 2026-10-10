import type { PaymentProvider, StartSubscriptionInput } from "./port";

// A fake payment provider for tests and local development: it never moves money and never calls a network.
// It can be told to fail, so the failure paths are tested too. It must never be wired into production.
export type FakePaymentProvider = PaymentProvider & { readonly started: StartSubscriptionInput[]; readonly cancelled: string[]; failNext(): void };

export function createFakePaymentProvider(): FakePaymentProvider {
  const started: StartSubscriptionInput[] = [];
  const cancelled: string[] = [];
  let failing = false;
  return {
    started,
    cancelled,
    failNext() {
      failing = true;
    },
    async startSubscription(input) {
      if (failing) {
        failing = false;
        throw new Error("fake provider failure");
      }
      started.push(input);
      return { providerRef: `fake_sub_${started.length}`, status: "active" };
    },
    async cancelSubscription(providerRef) {
      cancelled.push(providerRef);
    },
  };
}
