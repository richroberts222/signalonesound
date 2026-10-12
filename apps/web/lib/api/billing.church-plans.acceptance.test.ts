import { describe, expect, it, vi } from "vitest";

import { createFakeBillingRepo, emptyBillingWorld } from "../../db/billing.fake";
import { createAdminDirectory } from "../auth/admin";
import { createFakePaymentProvider } from "../payments/fake";
import { createBillingService } from "../services/billing";
import { billingRoutes } from "./billing";
import { createApiRoute } from "./handler";

// Executable acceptance criteria for S14 (docs/features/s14-church-plans.md), verified at the API boundary with the
// real routes and service over the in-memory repo and a fake payment provider. No money moves.
type Json = { ok: boolean; data: any; error?: { code: string } }; // eslint-disable-line @typescript-eslint/no-explicit-any
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("S14 church plans and flagship places (API boundary)", () => {
  const admin = `user_${"A".repeat(10)}`;
  const manager = `user_${"M".repeat(10)}`;
  const other = `user_${"O".repeat(10)}`;
  const church = uuid(1);
  const otherChurch = uuid(2);
  const unapproved = uuid(3);

  const setup = (paymentsOn = true) => {
    const world = emptyBillingWorld();
    const provider = createFakePaymentProvider();
    const approved = new Set([church, otherChurch]);
    const service = createBillingService({
      repo: createFakeBillingRepo(world),
      admins: createAdminDirectory([admin]),
      provider,
      paymentsEnabled: () => paymentsOn,
      organizations: { isApprovedManager: async (orgId, userId) => orgId === church && userId === manager, isApproved: async (id) => approved.has(id) },
    });
    const as = (userId: string | null) => {
      const routes = billingRoutes(createApiRoute({ getUserId: vi.fn().mockResolvedValue(userId), onUnexpected: vi.fn() }), () => service);
      const call = async (p: Promise<Response>) => {
        const res = await p;
        return { status: res.status, json: (await res.json()) as Json };
      };
      const send = (method: string, body?: unknown) => new Request("http://localhost/x", { method, body: body === undefined ? undefined : JSON.stringify(body) });
      const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
      return {
        entitlement: (id: string) => call(routes.organizationEntitlement.GET(send("GET"), ctx(id))),
        checkout: (id: string, body: unknown) => call(routes.organizationCheckout.POST(send("POST", body), ctx(id))),
        portal: (id: string) => call(routes.organizationPortal.POST(send("POST"), ctx(id))),
        flagship: (body: unknown) => call(routes.flagship.PUT(send("PUT", body))),
        status: () => call(routes.flagship.GET(send("GET"))),
        setRule: (body: unknown) => call(routes.rule.PUT(send("PUT", body), { params: Promise.resolve({ accountType: "organization" }) })),
        createPlan: (body: unknown) => call(routes.plans.POST(send("POST", body))),
        updatePlan: (id: string, body: unknown) => call(routes.plan.PATCH(send("PATCH", body), ctx(id))),
      };
    };
    const orgPlan = async (type = "organization", active = true) => {
      const a = as(admin);
      const created = await a.createPlan({ accountType: type, name: `${type} plan`, interval: "month", amountMinor: 300, currency: "usd" });
      if (active) await a.updatePlan(created.json.data.id, { active: true });
      return created.json.data.id as string;
    };
    return { world, provider, as, orgPlan };
  };
  const flag = (id: string, enabled = true) => ({ organizationId: id, enabled, reason: "First 50 flagship" });

  it("AC1: only an approved manager of the church (or an admin) can use church checkout, billing page and entitlement", async () => {
    const s = setup();
    const plan = await s.orgPlan();
    for (const who of [null, other, manager]) {
      const a = s.as(who);
      const target = who === manager ? otherChurch : church; // the manager of ONE church is a stranger to another
      const res = await a.checkout(target, { planId: plan });
      expect(res.status, String(who)).toBe(who === null ? 401 : 404);
      expect((await a.entitlement(target)).status).toBe(who === null ? 401 : 404);
      expect((await a.portal(target)).status).toBe(who === null ? 401 : 404);
    }
    expect(s.provider.checkouts).toEqual([]);
    expect((await s.as(manager).entitlement(church)).status).toBe(200);
    expect((await s.as(admin).entitlement(church)).status).toBe(200);
  });

  it("AC2: checkout needs payments on and an ACTIVE ORGANIZATION plan, and charges the church", async () => {
    const off = setup(false);
    const offPlan = await off.orgPlan();
    expect((await off.as(manager).checkout(church, { planId: offPlan })).status).toBe(404);

    const s = setup();
    const memberPlan = await s.orgPlan("member");
    const inactive = await s.orgPlan("organization", false);
    const plan = await s.orgPlan();
    for (const planId of [memberPlan, inactive, uuid(99)]) expect((await s.as(manager).checkout(church, { planId })).status).toBe(404);
    expect((await s.as(manager).checkout(church, { planId: "nope" })).status).toBe(400);
    expect(s.provider.checkouts).toEqual([]);

    const ok = await s.as(manager).checkout(church, { planId: plan });
    expect(ok.status).toBe(200);
    expect(Object.keys(ok.json.data)).toEqual(["url"]);
    expect(s.provider.checkouts[0]).toMatchObject({ accountType: "organization", accountId: church, planId: plan, amountMinor: 300, interval: "month" });
    expect(s.provider.checkouts[0].successUrl).toContain(`/manage/${church}/membership`);
  });

  it("AC3: a church that already has an active plan gets 409 from checkout", async () => {
    const s = setup();
    const plan = await s.orgPlan();
    await s.as(admin).flagship(flag(church));
    expect((await s.as(manager).checkout(church, { planId: plan })).status).toBe(409);
    expect(s.provider.checkouts).toEqual([]);
  });

  it("AC4: the billing page needs a church with a provider customer reference", async () => {
    const s = setup();
    expect((await s.as(manager).portal(church)).status).toBe(404);
  });

  it("AC6: the church's entitlement follows the organization rule, never the client", async () => {
    const s = setup();
    expect((await s.as(manager).entitlement(church)).json.data).toMatchObject({ accountType: "organization", entitled: true, reason: "not_required" });
    await s.as(admin).setRule({ paymentRequired: true, trialDays: 0, defaultPlanId: null });
    expect((await s.as(manager).entitlement(church)).json.data).toMatchObject({ entitled: false, reason: "payment_required" });
  });

  it("AC7: only an admin can change or read the flagship places", async () => {
    const s = setup();
    for (const who of [null, manager]) {
      expect((await s.as(who).flagship(flag(church))).status).toBe(who === null ? 401 : 404);
      expect((await s.as(who).status()).status).toBe(who === null ? 401 : 404);
    }
    expect(s.world.subscriptions.size).toBe(0);
    expect(s.world.audit).toHaveLength(0);
  });

  it("AC8: flagship needs an approved church, a flag and a reason; a paying church is refused", async () => {
    const s = setup();
    const a = s.as(admin);
    expect((await a.flagship({ organizationId: church, enabled: true, reason: "  " })).status).toBe(400);
    expect((await a.flagship({ organizationId: church, reason: "x" })).status).toBe(400);
    expect((await a.flagship({ ...flag(church), extra: 1 })).status).toBe(400);
    expect((await a.flagship(flag(unapproved))).status).toBe(404);
    expect((await a.flagship(flag(uuid(77)))).status).toBe(404);
    s.world.subscriptions.set(`organization:${church}`, { id: "r", accountType: "organization", accountId: church, planId: null, priceId: null, status: "active", trialEndsAt: null, providerRef: "sub_paid", providerCustomerRef: "cus_1", providerEventAt: null, flagshipSlot: null, createdAt: new Date() });
    expect((await a.flagship(flag(church))).status).toBe(409);
    expect(s.world.subscriptions.get(`organization:${church}`)?.flagshipSlot).toBeNull();
    expect(s.world.audit).toHaveLength(0);
  });

  it("AC9: at most 50 places; a repeat uses no extra place; disabling frees one", async () => {
    const s = setup();
    const a = s.as(admin);
    for (let i = 0; i < 50; i++) s.world.subscriptions.set(`organization:${uuid(1000 + i)}`, { id: `r${i}`, accountType: "organization", accountId: uuid(1000 + i), planId: null, priceId: null, status: "active", trialEndsAt: null, providerRef: null, providerCustomerRef: null, providerEventAt: null, flagshipSlot: i + 1, createdAt: new Date() });
    expect((await a.status()).json.data).toEqual({ used: 50, limit: 50 });
    expect((await a.flagship(flag(church))).status).toBe(409);
    expect((await a.status()).json.data.used).toBe(50);
    s.world.subscriptions.delete(`organization:${uuid(1000)}`);
    expect((await a.flagship(flag(church))).json.data).toMatchObject({ enabled: true, used: 50, limit: 50 });
    expect((await a.flagship(flag(church))).json.data.used).toBe(50); // a repeat takes no second place
    expect((await a.flagship(flag(church, false))).json.data).toMatchObject({ enabled: false, used: 49 });
    expect(s.world.subscriptions.has(`organization:${church}`)).toBe(false);
  });

  it("AC10: a flagship church is entitled whatever the rule says, and a provider event cannot change it", async () => {
    const s = setup();
    await s.as(admin).setRule({ paymentRequired: true, trialDays: 0, defaultPlanId: null });
    await s.as(admin).flagship(flag(church));
    expect((await s.as(manager).entitlement(church)).json.data).toMatchObject({ entitled: true, reason: "active", status: "active" });
    // A (stray) checkout-completed event for this church must not overwrite the free-for-life place.
    const repo = createFakeBillingRepo(s.world);
    await repo.applyCheckoutCompleted({ accountType: "organization", accountId: church, planId: uuid(5), priceId: uuid(6), subscriptionRef: "sub_x", customerRef: "cus_x", at: new Date() });
    expect(s.world.subscriptions.get(`organization:${church}`)).toMatchObject({ providerRef: null, flagshipSlot: expect.any(Number) });
  });

  it("AC11: every flagship change writes an audit entry with the actor, the church and the reason", async () => {
    const s = setup();
    await s.as(admin).flagship(flag(church));
    await s.as(admin).flagship(flag(church, false));
    const entries = s.world.audit.filter((e) => e.action.startsWith("billing.flagship"));
    expect(entries.map((e) => e.action)).toEqual(["billing.flagship.enable", "billing.flagship.disable"]);
    expect(entries[0]).toMatchObject({ actorId: admin, subject: `organization:${church}` });
    expect(JSON.parse(entries[0].detail)).toEqual({ reason: "First 50 flagship" });
  });
});
