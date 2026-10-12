import { describe, expect, it, vi } from "vitest";

import { createFakeBillingRepo, emptyBillingWorld } from "../../db/billing.fake";
import { createAdminDirectory } from "../auth/admin";
import { createFakePaymentProvider } from "../payments/fake";
import { createBillingService } from "../services/billing";
import { billingRoutes } from "./billing";
import { createApiRoute } from "./handler";

// Executable acceptance criteria for S20 (docs/features/s20-plan-perks.md), verified at the API boundary with the
// real routes and service over the in-memory repo. No money moves.
type Json = { ok: boolean; data: any; error?: { code: string } }; // eslint-disable-line @typescript-eslint/no-explicit-any
const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

describe("S20 plan perks (API boundary)", () => {
  const admin = `user_${"A".repeat(10)}`;
  const member = `user_${"M".repeat(10)}`;

  const setup = () => {
    const world = emptyBillingWorld();
    const service = createBillingService({
      repo: createFakeBillingRepo(world),
      admins: createAdminDirectory([admin]),
      provider: createFakePaymentProvider(),
      paymentsEnabled: () => true,
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
        listPerks: () => call(routes.perks.GET(send("GET"))),
        createPerk: (body: unknown) => call(routes.perks.POST(send("POST", body))),
        updatePerk: (id: string, body: unknown) => call(routes.perk.PATCH(send("PATCH", body), ctx(id))),
        planPerks: () => call(routes.planPerks.GET(send("GET"))),
        setPlanPerks: (id: string, body: unknown) => call(routes.planPerksSet.PUT(send("PUT", body), ctx(id))),
        createPlan: (body: unknown) => call(routes.plans.POST(send("POST", body))),
        activate: (id: string) => call(routes.plan.PATCH(send("PATCH", { active: true }), ctx(id))),
        setRule: (type: string, body: unknown) => call(routes.rule.PUT(send("PUT", body), { params: Promise.resolve({ accountType: type }) })),
        publicPlans: () => call(routes.publicPlans.GET(send("GET"))),
        mine: () => call(routes.entitlements.GET(send("GET"))),
        grantTrial: (body: unknown) => call(routes.trials.PUT(send("PUT", body))),
      };
    };
    return { world, service, as };
  };
  const perk = (key: string, extra: object = {}) => ({ key, label: `Label ${key}`, description: "Does a thing", accountType: "member", ...extra });
  const makePerk = async (s: ReturnType<typeof setup>, key: string, extra: object = {}) => (await s.as(admin).createPerk(perk(key, extra))).json.data.id as string;
  const makePlan = async (s: ReturnType<typeof setup>, type = "member") => {
    const created = await s.as(admin).createPlan({ accountType: type, name: `${type} plan`, interval: "month", amountMinor: 300, currency: "usd" });
    await s.as(admin).activate(created.json.data.id);
    return created.json.data.id as string;
  };
  const payRequired = (s: ReturnType<typeof setup>, trialDays = 0, defaultPlanId: string | null = null) => s.as(admin).setRule("member", { paymentRequired: true, trialDays, defaultPlanId });
  const paid = (s: ReturnType<typeof setup>, planId: string, userId = member) =>
    s.world.subscriptions.set(`member:${userId}`, { id: "r", accountType: "member", accountId: userId, planId, priceId: null, status: "active", trialEndsAt: null, providerRef: "sub_1", providerCustomerRef: "cus_1", providerEventAt: null, flagshipSlot: null, createdAt: new Date() });

  it("AC1: only an admin can list, create or change perks and plan perks; nothing is written otherwise", async () => {
    const s = setup();
    const planId = await makePlan(s);
    const perkId = await makePerk(s, "ad_free");
    const writesBefore = s.world.audit.length;
    for (const who of [null, member]) {
      const a = s.as(who);
      const want = who === null ? 401 : 404;
      expect((await a.listPerks()).status).toBe(want);
      expect((await a.createPerk(perk("promo"))).status).toBe(want);
      expect((await a.updatePerk(perkId, { active: false })).status).toBe(want);
      expect((await a.planPerks()).status).toBe(want);
      expect((await a.setPlanPerks(planId, { perkIds: [perkId] })).status).toBe(want);
    }
    expect(s.world.perks.size).toBe(1);
    expect(s.world.perks.get(perkId)?.active).toBe(true);
    expect(s.world.planPerks.size).toBe(0);
    expect(s.world.audit).toHaveLength(writesBefore);
  });

  it("AC2: a perk needs a good key, a label and plain text; duplicates and extra fields are refused", async () => {
    const s = setup();
    const a = s.as(admin);
    for (const key of ["", "ab", "Ad_Free", "1abc", "has space", "x".repeat(41), "bad-dash", "<b>hi</b>"]) expect((await a.createPerk(perk(key))).status, key).toBe(400);
    const noName = await a.createPerk(perk("fine_key", { label: "  " }));
    expect(noName.status).toBe(400);
    expect(JSON.stringify(noName.json)).toContain("A name is required"); // in words, never a raw validation message
    expect((await a.createPerk(perk("fine_key", { label: "x".repeat(61) }))).status).toBe(400);
    expect((await a.createPerk(perk("fine_key", { description: "x".repeat(301) }))).status).toBe(400);
    expect((await a.createPerk(perk("fine_key", { label: "bad\u0007label" }))).status).toBe(400);
    expect((await a.createPerk(perk("fine_key", { accountType: "robot" }))).status).toBe(400);
    expect((await a.createPerk({ ...perk("fine_key"), extra: 1 })).status).toBe(400);
    expect(s.world.perks.size).toBe(0);
    const ok = await a.createPerk({ key: "fine_key", label: "Fine", accountType: "member" });
    expect(ok.status).toBe(200);
    expect(ok.json.data).toMatchObject({ key: "fine_key", label: "Fine", description: "", active: true });
    expect((await a.createPerk(perk("fine_key"))).status).toBe(409);
    expect(s.world.perks.size).toBe(1);
  });

  it("AC3: label, description and active can change; the key and account type cannot", async () => {
    const s = setup();
    const a = s.as(admin);
    const id = await makePerk(s, "ad_free");
    const changed = await a.updatePerk(id, { label: "No ads", description: "No adverts", active: false });
    expect(changed.json.data).toMatchObject({ key: "ad_free", accountType: "member", label: "No ads", description: "No adverts", active: false });
    expect((await a.updatePerk(id, { key: "other" })).status).toBe(400);
    expect((await a.updatePerk(id, { accountType: "organization" })).status).toBe(400);
    expect((await a.updatePerk(id, {})).status).toBe(400);
    expect((await a.updatePerk(uuid(99), { active: true })).status).toBe(404);
    expect(s.world.perks.get(id)).toMatchObject({ key: "ad_free", accountType: "member" });
    expect(s.world.audit.filter((e) => e.action === "billing.perk.update")).toHaveLength(1);
  });

  it("AC4: plan perks accept only perks of the plan's type, replace the list, and write one audit entry", async () => {
    const s = setup();
    const a = s.as(admin);
    const planId = await makePlan(s);
    const memberPerk = await makePerk(s, "ad_free");
    const second = await makePerk(s, "early_access");
    const churchPerk = await makePerk(s, "analytics", { accountType: "organization" });
    for (const bad of [[churchPerk], [memberPerk, churchPerk], [uuid(77)], ["nope"]]) expect((await a.setPlanPerks(planId, { perkIds: bad })).status).toBe(400);
    expect((await a.setPlanPerks(planId, { perkIds: [memberPerk], extra: 1 })).status).toBe(400);
    expect((await a.setPlanPerks(uuid(88), { perkIds: [] })).status).toBe(404);
    expect(s.world.planPerks.size).toBe(0);
    expect(s.world.audit.filter((e) => e.action === "billing.plan.perks")).toHaveLength(0);

    expect((await a.setPlanPerks(planId, { perkIds: [memberPerk, second, memberPerk] })).json.data).toEqual({ planId, perkIds: [memberPerk, second] });
    expect((await a.setPlanPerks(planId, { perkIds: [second] })).json.data.perkIds).toEqual([second]); // replaced, not added to
    expect((await a.planPerks()).json.data.items).toEqual([{ planId, perkIds: [second] }]);
    const entries = s.world.audit.filter((e) => e.action === "billing.plan.perks");
    expect(entries).toHaveLength(2);
    expect(entries[1]).toMatchObject({ actorId: admin, subject: `plan:${planId}` });
  });

  it("AC5: a paying member has exactly the active perks of their plan, derived on the server", async () => {
    const s = setup();
    const planId = await makePlan(s);
    const otherPlan = await makePlan(s);
    const adFree = await makePerk(s, "ad_free");
    const early = await makePerk(s, "early_access");
    const off = await makePerk(s, "retired");
    await s.as(admin).setPlanPerks(planId, { perkIds: [adFree, off] });
    await s.as(admin).setPlanPerks(otherPlan, { perkIds: [early] });
    await s.as(admin).updatePerk(off, { active: false });
    await payRequired(s);
    paid(s, planId);
    expect((await s.as(member).mine()).json.data.items[0]).toMatchObject({ entitled: true, reason: "active", perks: ["ad_free"] }); // the retired perk is never listed
    await s.as(admin).setPlanPerks(planId, { perkIds: [adFree, early] }); // changing strategy in the console takes effect at once
    expect((await s.as(member).mine()).json.data.items[0].perks.sort()).toEqual(["ad_free", "early_access"]);
    await s.as(admin).setPlanPerks(planId, { perkIds: [] });
    expect((await s.as(member).mine()).json.data.items[0].perks).toEqual([]); // a plan can include nothing
  });

  it("AC5: a free trial gets the default plan's perks, or every active perk when there is no default plan", async () => {
    const s = setup();
    const planId = await makePlan(s);
    const adFree = await makePerk(s, "ad_free");
    await makePerk(s, "early_access");
    await s.as(admin).setPlanPerks(planId, { perkIds: [adFree] });
    await payRequired(s, 30, null);
    expect((await s.as(member).mine()).json.data.items[0]).toMatchObject({ reason: "trialing" });
    expect((await s.as(member).mine()).json.data.items[0].perks.sort()).toEqual(["ad_free", "early_access"]);
    await payRequired(s, 30, planId);
    expect((await s.as(member).mine()).json.data.items[0].perks).toEqual(["ad_free"]);
  });

  it("AC5: a free-for-life flagship church (no plan) has every active church perk", async () => {
    const s = setup();
    const a = await makePerk(s, "analytics", { accountType: "organization" });
    await makePerk(s, "ad_free");
    const church = uuid(1);
    s.world.subscriptions.set(`organization:${church}`, { id: "f", accountType: "organization", accountId: church, planId: null, priceId: null, status: "active", trialEndsAt: null, providerRef: null, providerCustomerRef: null, providerEventAt: null, flagshipSlot: 1, createdAt: new Date() });
    await s.as(admin).setRule("organization", { paymentRequired: true, trialDays: 0, defaultPlanId: null });
    expect(await s.service.perksFor("organization", church)).toEqual(["analytics"]);
    expect(a).toBeTruthy();
  });

  it("AC6: while payment is not required everyone has every active perk of their type", async () => {
    const s = setup();
    await makePerk(s, "ad_free");
    await makePerk(s, "early_access");
    await makePerk(s, "analytics", { accountType: "organization" });
    const retired = await makePerk(s, "retired");
    await s.as(admin).updatePerk(retired, { active: false });
    const mine = (await s.as(member).mine()).json.data.items[0];
    expect(mine).toMatchObject({ entitled: true, reason: "not_required" });
    expect(mine.perks.sort()).toEqual(["ad_free", "early_access"]);
  });

  it("AC7: an account that is not entitled has no perks", async () => {
    const s = setup();
    await makePerk(s, "ad_free");
    await payRequired(s, 0);
    expect((await s.as(member).mine()).json.data.items[0]).toMatchObject({ entitled: false, reason: "payment_required", perks: [] });
  });

  it("AC8: requirePerk allows an account with the perk and refuses one without", async () => {
    const s = setup();
    const planId = await makePlan(s);
    const adFree = await makePerk(s, "ad_free");
    await makePerk(s, "early_access");
    await s.as(admin).setPlanPerks(planId, { perkIds: [adFree] });
    await payRequired(s);
    paid(s, planId);
    const ctx = { actor: { userId: member } } as Parameters<typeof s.service.requirePerk>[0];
    await expect(s.service.requirePerk(ctx, "ad_free")).resolves.toBeUndefined();
    await expect(s.service.requirePerk(ctx, "early_access")).rejects.toMatchObject({ code: "not_found" });
    await expect(s.service.requirePerk(ctx, "unknown_perk")).rejects.toMatchObject({ code: "not_found" });
  });

  it("AC9: the public plans list shows each active plan's active perks and no admin-only fields", async () => {
    const s = setup();
    const planId = await makePlan(s);
    const adFree = await makePerk(s, "ad_free", { label: "No ads", description: "Browse without adverts" });
    const retired = await makePerk(s, "retired");
    await s.as(admin).setPlanPerks(planId, { perkIds: [adFree, retired] });
    await s.as(admin).updatePerk(retired, { active: false });
    const plan = (await s.as(null).publicPlans()).json.data.items[0];
    expect(plan.perks).toEqual([{ key: "ad_free", label: "No ads", description: "Browse without adverts" }]);
    expect(JSON.stringify(plan)).not.toContain(adFree); // no perk ids
  });
});
