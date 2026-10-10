import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

import { createFakeBillingRepo, emptyBillingWorld } from "../../db/billing.fake";
import { createAdminDirectory } from "../auth/admin";
import { createFakePaymentProvider } from "../payments/fake";
import type { ProviderEvent } from "../payments/port";
import { unconfiguredPaymentProvider } from "../payments/unconfigured";
import { createBillingService } from "../services/billing";
import { policyReacceptanceRequired } from "../services/errors";
import { billingRoutes } from "./billing";
import { createApiRoute } from "./handler";

// Executable acceptance criteria for S11 (docs/features/s11-stripe-checkout-and-webhooks.md), verified at the
// API boundary: real Request -> adapter -> authentication -> validation -> real service -> repo (a fake that
// behaves like the database) -> a fake payment provider. No Stripe, no network, no money.
type Json = { ok: boolean; data: any; error?: { code: string; message?: string } }; // eslint-disable-line @typescript-eslint/no-explicit-any
const admin = `user_${"A".repeat(10)}`;
const member = `user_${"M".repeat(10)}`;
const stranger = `user_${"S".repeat(10)}`;
const base = "http://localhost:3000/api/v1";
const T = (minutes: number) => new Date(Date.UTC(2026, 9, 10, 12, minutes, 0));

/** The fake provider reads a test event from the body: { kind, eventId, at (minutes), ...fields }. */
const eventsFromBody = (raw: string): ProviderEvent => {
  const { at, ...rest } = JSON.parse(raw) as { at: number } & Record<string, unknown>;
  return { ...rest, at: T(at) } as ProviderEvent;
};

describe("S11 Stripe checkout and webhooks acceptance criteria (API boundary)", () => {
  const setup = ({ enabled = true }: { enabled?: boolean } = {}) => {
    const world = emptyBillingWorld();
    const inner = createFakeBillingRepo(world);
    // Counts how often a notification is APPLIED, so a replay is visible even when the state would not change.
    const applied = { checkout: 0, status: 0 };
    const repo: typeof inner = {
      ...inner,
      applyCheckoutCompleted: async (input) => {
        applied.checkout += 1;
        return inner.applyCheckoutCompleted(input);
      },
      setStatusByProviderRef: async (ref, status, at) => {
        applied.status += 1;
        return inner.setStatusByProviderRef(ref, status, at);
      },
    };
    const provider = createFakePaymentProvider(eventsFromBody);
    const flags = { enabled, unaccepted: new Set<string>() };
    const service = createBillingService({
      repo,
      admins: { isAdmin: (id) => createAdminDirectory([admin]).isAdmin(id) },
      provider,
      paymentsEnabled: () => flags.enabled,
      requireAccepted: async (userId) => {
        if (flags.unaccepted.has(userId)) throw policyReacceptanceRequired();
      },
    });
    const as = (userId: string | null) => {
      const routes = billingRoutes(createApiRoute({ getUserId: vi.fn().mockResolvedValue(userId), onUnexpected: vi.fn() }), () => service);
      const call = async (pending: Promise<Response>) => {
        const res = await pending;
        return { status: res.status, json: (await res.json()) as Json };
      };
      const post = (url: string, body?: unknown, headers: Record<string, string> = {}) => new Request(url, { method: "POST", headers, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) });
      return {
        createPlan: (body: unknown) => call(routes.plans.POST(post(`${base}/admin/billing/plans`, body))),
        updatePlan: (id: string, body: unknown) => call(routes.plan.PATCH(new Request(`${base}/x`, { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id }) })),
        checkout: (body: unknown) => call(routes.checkout.POST(post(`${base}/me/checkout`, body))),
        portal: () => call(routes.portal.POST(post(`${base}/me/billing-portal`))),
        webhook: (event: Record<string, unknown>, signature?: string | null, raw = JSON.stringify(event)) => {
          const headers: Record<string, string> = {};
          const sig = signature === undefined ? provider.sign(raw) : signature;
          if (sig !== null) headers["stripe-signature"] = sig;
          return call(routes.webhook.POST(post(`${base}/webhooks/stripe`, raw, headers)));
        },
        entitlements: () => call(routes.entitlements.GET(new Request(`${base}/me/entitlements`))),
      };
    };
    const activePlan = async (over: Record<string, unknown> = {}) => {
      const plan = (await as(admin).createPlan({ accountType: "member", name: "Member monthly", interval: "month", amountMinor: 300, currency: "usd", ...over })).json.data;
      await as(admin).updatePlan(plan.id, { active: true });
      return plan;
    };
    return { as, world, repo, provider, service, flags, activePlan, applied };
  };
  const completed = (planId: string, over: Record<string, unknown> = {}) => ({ kind: "checkout_completed", eventId: "evt_1", at: 1, accountType: "member", accountId: member, planId, priceId: randomUUID(), subscriptionRef: "sub_1", customerRef: "cus_1", ...over });

  it("AC1 with payments off, checkout and the customer page answer 'not found' and nothing reaches the provider", async () => {
    const s = setup({ enabled: false });
    const plan = await s.activePlan();
    expect((await s.as(member).checkout({ planId: plan.id })).status).toBe(404);
    expect((await s.as(member).portal()).status).toBe(404);
    expect(s.provider.checkouts).toEqual([]);
    expect(s.provider.portals).toEqual([]);
  });

  it("AC1 with no provider configured, every webhook is refused", async () => {
    const world = emptyBillingWorld();
    const service = createBillingService({ repo: createFakeBillingRepo(world), admins: { isAdmin: () => false }, provider: unconfiguredPaymentProvider });
    const routes = billingRoutes(createApiRoute({ getUserId: vi.fn(), onUnexpected: vi.fn() }), () => service);
    const res = await routes.webhook.POST(new Request(`${base}/webhooks/stripe`, { method: "POST", headers: { "stripe-signature": "anything" }, body: "{}" }));
    expect(res.status).toBe(400);
    expect(world.subscriptions.size).toBe(0);
  });

  it("AC2 checkout needs a signed-in member who accepted the terms, and an active member plan", async () => {
    const s = setup();
    const plan = await s.activePlan();
    expect((await s.as(null).checkout({ planId: plan.id })).status).toBe(401);
    s.flags.unaccepted.add(stranger);
    expect((await s.as(stranger).checkout({ planId: plan.id })).status).toBe(403); // must accept the current terms first
    const inactive = (await s.as(admin).createPlan({ accountType: "member", name: "Off", interval: "month", amountMinor: 100, currency: "usd" })).json.data;
    const org = await s.activePlan({ accountType: "organization", name: "Church plan" });
    for (const planId of [inactive.id, org.id, randomUUID()]) expect((await s.as(member).checkout({ planId })).status, planId).toBe(404);
    expect((await s.as(member).checkout({ planId: "not-a-uuid" })).status).toBe(400);
    expect((await s.as(member).checkout({})).status).toBe(400);
    expect(s.provider.checkouts).toEqual([]); // nothing reached the provider
    const ok = await s.as(member).checkout({ planId: plan.id });
    expect(ok.status).toBe(200);
    expect(Object.keys(ok.json.data)).toEqual(["url"]); // only the hosted page's address
    expect(ok.json.data.url).toMatch(/^https:\/\//);
  });

  it("AC2 someone who already has an active plan is told so (409) and sent nowhere", async () => {
    const s = setup();
    const plan = await s.activePlan();
    await s.as(null).webhook(completed(plan.id));
    const again = await s.as(member).checkout({ planId: plan.id });
    expect(again.status).toBe(409);
    expect(s.provider.checkouts).toEqual([]);
  });

  it("AC3 the checkout carries OUR price in whole cents, the account in metadata and our own return addresses; a client cannot choose the amount", async () => {
    const s = setup();
    const plan = await s.activePlan({ amountMinor: 1234 });
    await s.as(member).checkout({ planId: plan.id });
    expect(s.provider.checkouts).toHaveLength(1);
    expect(s.provider.checkouts[0]).toMatchObject({ accountType: "member", accountId: member, planId: plan.id, amountMinor: 1234, currency: "usd", interval: "month", planName: "Member monthly" });
    expect(Number.isInteger(s.provider.checkouts[0].amountMinor)).toBe(true);
    expect(s.provider.checkouts[0].priceId).toBe(plan.price.id);
    expect(s.provider.checkouts[0].successUrl).toBe("http://localhost:3000/services?checkout=success");
    expect(s.provider.checkouts[0].cancelUrl).toBe("http://localhost:3000/services?checkout=cancelled");
    for (const extra of [{ amountMinor: 1 }, { amount: 1 }, { price: 1 }, { currency: "eur" }, { interval: "year" }]) {
      expect((await s.as(member).checkout({ planId: plan.id, ...extra })).status, JSON.stringify(extra)).toBe(400); // only the plan is accepted
    }
    expect(s.provider.checkouts).toHaveLength(1);
    // a price change takes effect for the next checkout (the plan's current price is read each time)
    await s.as(admin).updatePlan(plan.id, { price: { interval: "year", amountMinor: 9900, currency: "usd" } });
    await s.as(stranger).checkout({ planId: plan.id });
    expect(s.provider.checkouts[1]).toMatchObject({ amountMinor: 9900, interval: "year" });
  });

  it("AC4 the customer page needs a subscription with a customer reference; anyone else is 'not found'", async () => {
    const s = setup();
    const plan = await s.activePlan();
    expect((await s.as(member).portal()).status).toBe(404); // no subscription
    await s.as(null).webhook(completed(plan.id, { customerRef: null }));
    expect((await s.as(member).portal()).status).toBe(404); // a subscription, but no customer reference
    await s.as(null).webhook(completed(plan.id, { eventId: "evt_2", at: 2, customerRef: "cus_9" }));
    const ok = await s.as(member).portal();
    expect(ok.status).toBe(200);
    expect(ok.json.data.url).toContain("cus_9");
    expect(s.provider.portals[0]).toMatchObject({ customerRef: "cus_9", returnUrl: "http://localhost:3000/services" });
    expect((await s.as(stranger).portal()).status).toBe(404); // another person has none
    expect((await s.as(null).portal()).status).toBe(401);
  });

  it("AC5 a webhook with a missing, wrong or altered signature is refused and changes nothing", async () => {
    const s = setup();
    const plan = await s.activePlan();
    const event = completed(plan.id);
    expect((await s.as(null).webhook(event, null)).status).toBe(400);
    expect((await s.as(null).webhook(event, "wrong")).status).toBe(400);
    expect((await s.as(null).webhook(event, s.provider.sign(JSON.stringify(event)), `${JSON.stringify(event)} `)).status).toBe(400); // altered after signing
    expect(s.world.subscriptions.size).toBe(0);
    expect(s.world.paymentEvents.size).toBe(0);
    expect((await s.as(null).webhook(event)).status).toBe(200); // the right signature is accepted, with no sign-in
  });

  it("AC6 a replayed event changes nothing and still answers 200", async () => {
    const s = setup();
    const plan = await s.activePlan();
    expect((await s.as(null).webhook(completed(plan.id))).status).toBe(200);
    await s.as(null).webhook({ kind: "subscription_cancelled", eventId: "evt_2", at: 2, subscriptionRef: "sub_1" });
    expect(s.world.subscriptions.get(`member:${member}`)?.status).toBe("cancelled");
    expect(s.applied).toEqual({ checkout: 1, status: 1 });
    const replay = await s.as(null).webhook(completed(plan.id)); // Stripe retries the first event
    expect(replay).toMatchObject({ status: 200, json: { ok: true, data: { received: true } } });
    expect(s.world.subscriptions.get(`member:${member}`)?.status).toBe("cancelled"); // not reactivated by the replay
    expect(s.applied).toEqual({ checkout: 1, status: 1 }); // the replay was recognized by its id and never applied again
    expect(s.world.paymentEvents.size).toBe(2);
  });

  it("AC6 an older notification never moves a subscription backwards", async () => {
    const s = setup();
    const plan = await s.activePlan();
    await s.as(null).webhook(completed(plan.id, { at: 1 }));
    await s.as(null).webhook({ kind: "subscription_cancelled", eventId: "evt_3", at: 5, subscriptionRef: "sub_1" });
    await s.as(null).webhook({ kind: "subscription_active", eventId: "evt_2", at: 3, subscriptionRef: "sub_1" }); // arrives late, happened earlier
    expect(s.world.subscriptions.get(`member:${member}`)?.status).toBe("cancelled");
    await s.as(null).webhook(completed(plan.id, { eventId: "evt_4", at: 2, subscriptionRef: "sub_old" })); // an old checkout must not overwrite either
    expect(s.world.subscriptions.get(`member:${member}`)?.providerRef).toBe("sub_1");
    await s.as(null).webhook({ kind: "subscription_active", eventId: "evt_5", at: 9, subscriptionRef: "sub_1" }); // a newer one does apply
    expect(s.world.subscriptions.get(`member:${member}`)?.status).toBe("active");
  });

  it("AC7 checkout completed, payment failed and cancelled change the state by Stripe's own reference", async () => {
    const s = setup();
    const plan = await s.activePlan();
    await s.as(null).webhook(completed(plan.id));
    expect(s.world.subscriptions.get(`member:${member}`)).toMatchObject({ status: "active", providerRef: "sub_1", providerCustomerRef: "cus_1", planId: plan.id });
    await s.as(null).webhook({ kind: "payment_failed", eventId: "evt_2", at: 2, subscriptionRef: "sub_1" });
    expect(s.world.subscriptions.get(`member:${member}`)?.status).toBe("past_due");
    await s.as(null).webhook({ kind: "subscription_cancelled", eventId: "evt_3", at: 3, subscriptionRef: "sub_1" });
    expect(s.world.subscriptions.get(`member:${member}`)?.status).toBe("cancelled");
  });

  it("AC7 an unknown event type and an unknown subscription are acknowledged and change nothing", async () => {
    const s = setup();
    const plan = await s.activePlan();
    await s.as(null).webhook(completed(plan.id));
    const before = JSON.stringify([...s.world.subscriptions.values()]);
    expect((await s.as(null).webhook({ kind: "ignored", eventId: "evt_9", at: 9, type: "customer.created" })).status).toBe(200);
    expect((await s.as(null).webhook({ kind: "subscription_cancelled", eventId: "evt_10", at: 10, subscriptionRef: "sub_nobody" })).status).toBe(200);
    expect(JSON.stringify([...s.world.subscriptions.values()])).toBe(before);
  });

  it("AC7 a browser cannot change a subscription: only a verified notification does", async () => {
    const s = setup();
    const plan = await s.activePlan();
    await s.as(member).checkout({ planId: plan.id }); // starting checkout alone grants nothing
    expect(s.world.subscriptions.size).toBe(0);
    expect((await s.as(member).entitlements()).json.data.items[0].reason).toBe("not_required");
  });

  it("AC8 entitlement follows the stored state: active is entitled; past due and cancelled are not", async () => {
    const s = setup();
    const plan = await s.activePlan();
    await s.as(admin).entitlements(); // the admin route set is not needed here
    await s.service.updateRule({ actor: { userId: admin } }, "member", { paymentRequired: true, trialDays: 0, defaultPlanId: null });
    const check = async () => (await s.as(member).entitlements()).json.data.items[0];
    expect(await check()).toMatchObject({ entitled: false, reason: "payment_required" });
    await s.as(null).webhook(completed(plan.id));
    expect(await check()).toMatchObject({ entitled: true, reason: "active" });
    await s.as(null).webhook({ kind: "payment_failed", eventId: "evt_2", at: 2, subscriptionRef: "sub_1" });
    expect(await check()).toMatchObject({ entitled: false, status: "past_due" });
    await s.as(null).webhook({ kind: "subscription_active", eventId: "evt_3", at: 3, subscriptionRef: "sub_1" });
    expect(await check()).toMatchObject({ entitled: true });
    await s.as(null).webhook({ kind: "subscription_cancelled", eventId: "evt_4", at: 4, subscriptionRef: "sub_1" });
    expect(await check()).toMatchObject({ entitled: false, status: "cancelled" });
  });
});
