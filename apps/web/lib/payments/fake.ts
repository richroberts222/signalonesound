import { WebhookSignatureError, type CheckoutInput, type PaymentProvider, type PortalInput, type ProviderEvent, type StartSubscriptionInput } from "./port";

// A fake payment provider for tests and local development: it never moves money and never calls a network.
// It can be told to fail, and it verifies webhooks with a plain shared word so the signature paths are tested
// too. It must never be wired into production.
export type FakePaymentProvider = PaymentProvider & {
  readonly started: StartSubscriptionInput[];
  readonly cancelled: string[];
  readonly checkouts: CheckoutInput[];
  readonly portals: PortalInput[];
  failNext(): void;
  /** The exact signature this fake accepts for a body, so a test can send a valid or a broken one. */
  sign(rawBody: string): string;
};

export function createFakePaymentProvider(events: (rawBody: string) => ProviderEvent = () => ({ kind: "ignored", eventId: "evt_fake", at: new Date(), type: "fake" })): FakePaymentProvider {
  const started: StartSubscriptionInput[] = [];
  const cancelled: string[] = [];
  const checkouts: CheckoutInput[] = [];
  const portals: PortalInput[] = [];
  let failing = false;
  const sign = (rawBody: string) => `fake-signature:${rawBody.length}:${rawBody.slice(0, 8)}`;
  const failIfAsked = () => {
    if (failing) {
      failing = false;
      throw new Error("fake provider failure");
    }
  };
  return {
    started,
    cancelled,
    checkouts,
    portals,
    sign,
    failNext() {
      failing = true;
    },
    async startSubscription(input) {
      failIfAsked();
      started.push(input);
      return { providerRef: `fake_sub_${started.length}`, status: "active" };
    },
    async cancelSubscription(providerRef) {
      cancelled.push(providerRef);
    },
    async createCheckout(input) {
      failIfAsked();
      checkouts.push(input);
      return { url: `https://checkout.fake.example/session/${checkouts.length}` };
    },
    async createPortal(input) {
      failIfAsked();
      portals.push(input);
      return { url: `https://portal.fake.example/${input.customerRef}` };
    },
    readWebhook(rawBody, signature) {
      if (signature !== sign(rawBody)) throw new WebhookSignatureError();
      return events(rawBody);
    },
  };
}
