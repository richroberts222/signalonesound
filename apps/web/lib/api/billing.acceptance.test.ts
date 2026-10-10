import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { MAX_AMOUNT_MINOR, couponSchema, createPlanSchema, moneyAmountSchema, planSchema } from "@signalone/validation";

import { createFakeBillingRepo, emptyBillingWorld } from "../../db/billing.fake";
import { createAdminDirectory } from "../auth/admin";
import { createFakePaymentProvider } from "../payments/fake";
import { createBillingService, discountMinor } from "../services/billing";
import { billingRoutes } from "./billing";
import { createApiRoute } from "./handler";

// Executable acceptance criteria for S10 (docs/features/s10-payments-plans-and-switches.md), verified at the
// API boundary: real Request -> adapter -> authentication -> validation -> real service -> repo (a fake that
// behaves like the database; the integration suite runs the same expectations against the real one).
// Money is never real here: the payment provider is a fake.
type Json = { ok: boolean; data: any; error?: { code: string; message?: string; fieldErrors?: Record<string, string[]> } }; // eslint-disable-line @typescript-eslint/no-explicit-any
const DAY = 24 * 3600 * 1000;

describe("S10 payments: plans, switches and entitlement acceptance criteria (API boundary)", () => {
  const base = "http://localhost/api/v1";
  const admin = `user_${"A".repeat(10)}`;
  const member = `user_${"M".repeat(10)}`;

  const setup = () => {
    let clock = new Date("2026-10-10T12:00:00Z");
    const now = () => clock;
    const world = emptyBillingWorld();
    const repo = createFakeBillingRepo(world, now);
    const provider = createFakePaymentProvider();
    const admins = { list: [admin] };
    const service = createBillingService({ repo, admins: { isAdmin: (id) => createAdminDirectory(admins.list).isAdmin(id) }, provider, now });
    const as = (userId: string | null) => {
      const getUserId = vi.fn().mockResolvedValue(userId); // each helper keeps its own identity
      const routes = billingRoutes(createApiRoute({ getUserId, onUnexpected: vi.fn() }), () => service);
      const call = async (pending: Promise<Response>) => {
        const res = await pending;
        return { status: res.status, json: (await res.json()) as Json };
      };
      const ctx = (params: Record<string, string>) => ({ params: Promise.resolve(params) });
      const send = (method: string, url: string, body?: unknown) => new Request(url, { method, body: body === undefined ? undefined : JSON.stringify(body) });
      return {
        rules: () => call(routes.rules.GET(send("GET", `${base}/admin/billing/rules`))),
        setRule: (accountType: string, body: unknown) => call(routes.rule.PUT(send("PUT", `${base}/x`, body), ctx({ accountType }))),
        plans: () => call(routes.plans.GET(send("GET", `${base}/admin/billing/plans`))),
        createPlan: (body: unknown) => call(routes.plans.POST(send("POST", `${base}/x`, body))),
        updatePlan: (id: string, body: unknown) => call(routes.plan.PATCH(send("PATCH", `${base}/x`, body), ctx({ id }))),
        coupons: () => call(routes.coupons.GET(send("GET", `${base}/admin/billing/coupons`))),
        createCoupon: (body: unknown) => call(routes.coupons.POST(send("POST", `${base}/x`, body))),
        updateCoupon: (id: string, body: unknown) => call(routes.coupon.PATCH(send("PATCH", `${base}/x`, body), ctx({ id }))),
        audit: (query = "") => call(routes.audit.GET(send("GET", `${base}/admin/billing/audit${query}`))),
        entitlements: () => call(routes.entitlements.GET(send("GET", `${base}/me/entitlements`))),
        quote: (body: unknown) => call(routes.quote.POST(send("POST", `${base}/me/coupons/quote`, body))),
      };
    };
    const ctxOf = (userId: string) => ({ actor: { userId } });
    return { as, world, repo, provider, service, admins, ctxOf, advance: (ms: number) => (clock = new Date(clock.getTime() + ms)) };
  };
  const newPlan = (over: Record<string, unknown> = {}) => ({ accountType: "member", name: "Member monthly", interval: "month", amountMinor: 300, currency: "usd", ...over });

  it("AC1 only an admin can read or change rules, plans, coupons and the audit log; everyone else gets 404", async () => {
    const s = setup();
    const plan = (await s.as(admin).createPlan(newPlan())).json.data;
    const coupon = (await s.as(admin).createCoupon({ code: "WELCOME", percentOff: 10 })).json.data;
    for (const who of [member, null]) {
      const a = s.as(who);
      const results = [
        await a.rules(),
        await a.setRule("member", { paymentRequired: true, trialDays: 0, defaultPlanId: null }),
        await a.plans(),
        await a.createPlan(newPlan()),
        await a.updatePlan(plan.id, { active: true }),
        await a.coupons(),
        await a.createCoupon({ code: "SNEAKY", percentOff: 50 }),
        await a.updateCoupon(coupon.id, { active: false }),
        await a.audit(),
      ];
      results.forEach((r, i) => expect(r.status, `${who ?? "anonymous"} request ${i}`).toBe(who === null ? 401 : 404));
    }
    expect((await s.as(admin).rules()).status).toBe(200);
    // nothing the outsiders tried changed anything
    expect((await s.as(admin).plans()).json.data.items).toHaveLength(1);
    expect((await s.as(admin).coupons()).json.data.items).toHaveLength(1);
  });

  it("AC1 the admin list is read on every request (an admin removed from the list loses access at once)", async () => {
    const s = setup();
    expect((await s.as(admin).rules()).status).toBe(200);
    s.admins.list.length = 0;
    expect((await s.as(admin).rules()).status).toBe(404);
  });

  it("AC2 an admin sets payment required, trial days and a default plan per account type; it takes effect on the next check", async () => {
    const s = setup();
    const a = s.as(admin);
    expect((await a.rules()).json.data.items).toEqual([
      { accountType: "member", paymentRequired: false, trialDays: 0, defaultPlanId: null },
      { accountType: "organization", paymentRequired: false, trialDays: 0, defaultPlanId: null },
    ]); // payment is off by default for everyone
    const plan = (await a.createPlan(newPlan())).json.data;
    const saved = await a.setRule("member", { paymentRequired: true, trialDays: 14, defaultPlanId: plan.id });
    expect(saved.json.data).toEqual({ accountType: "member", paymentRequired: true, trialDays: 14, defaultPlanId: plan.id });
    expect((await a.rules()).json.data.items[0].paymentRequired).toBe(true);
    expect((await s.as(member).entitlements()).json.data.items[0].entitled).toBe(true); // a 14-day trial starts now
    // limits and shape
    for (const bad of [{ paymentRequired: true, trialDays: 366, defaultPlanId: null }, { paymentRequired: true, trialDays: -1, defaultPlanId: null }, { paymentRequired: true, trialDays: 1.5, defaultPlanId: null }, { paymentRequired: "yes", trialDays: 0, defaultPlanId: null }, { paymentRequired: true, trialDays: 0, defaultPlanId: null, extra: 1 }]) {
      expect((await a.setRule("member", bad)).status, JSON.stringify(bad)).toBe(400);
    }
    expect((await a.setRule("pet", { paymentRequired: true, trialDays: 0, defaultPlanId: null })).status).toBe(404); // not an account type
    expect((await a.setRule("organization", { paymentRequired: false, trialDays: 0, defaultPlanId: plan.id })).status).toBe(400); // a member plan is not an organization plan
    expect((await a.setRule("member", { paymentRequired: false, trialDays: 0, defaultPlanId: randomUUID() })).status).toBe(400);
  });

  it("AC3 with payment not required, every account is entitled and the provider is never asked", async () => {
    const s = setup();
    const r = await s.as(member).entitlements();
    expect(r.json.data.items).toEqual([{ accountType: "member", entitled: true, reason: "not_required", status: "none", trialEndsAt: null }]);
    expect(s.provider.started).toEqual([]);
    // a client cannot request the bypass or claim entitlement: the route takes no input at all
    const forged = await s.as(member).entitlements();
    expect(forged.json.data.items[0].reason).toBe("not_required");
    expect((await s.as(null).entitlements()).status).toBe(401);
    // the bypass is the server's rule: switching payment on removes it for everyone of that type
    await s.as(admin).setRule("member", { paymentRequired: true, trialDays: 0, defaultPlanId: null });
    expect((await s.as(member).entitlements()).json.data.items[0]).toMatchObject({ entitled: false, reason: "payment_required", status: "none" });
  });

  it("AC4 with payment required, only a trialing or active subscription is entitled", async () => {
    const s = setup();
    await s.as(admin).setRule("member", { paymentRequired: true, trialDays: 0, defaultPlanId: null });
    const plan = (await s.as(admin).createPlan(newPlan())).json.data;
    await s.as(admin).updatePlan(plan.id, { active: true });
    const check = async () => (await s.as(member).entitlements()).json.data.items[0];
    expect(await check()).toMatchObject({ entitled: false, status: "none" });
    await s.service.subscribe(s.ctxOf(member), { planId: plan.id });
    expect(await check()).toMatchObject({ entitled: true, reason: "active", status: "active" });
    for (const status of ["past_due", "cancelled"]) {
      const row = s.world.subscriptions.get(`member:${member}`)!;
      s.world.subscriptions.set(`member:${member}`, { ...row, status });
      expect(await check(), status).toMatchObject({ entitled: false, reason: "payment_required", status });
    }
    const row = s.world.subscriptions.get(`member:${member}`)!;
    s.world.subscriptions.set(`member:${member}`, { ...row, status: "trialing", trialEndsAt: new Date(Date.now() + 1000 * DAY) });
    expect(await check()).toMatchObject({ entitled: true, reason: "trialing" });
  });

  it("AC5 a trial starts automatically, once per account per type, and ends exactly trial-days later", async () => {
    const s = setup();
    await s.as(admin).setRule("member", { paymentRequired: true, trialDays: 7, defaultPlanId: null });
    const started = (await s.as(member).entitlements()).json.data.items[0];
    expect(started).toMatchObject({ entitled: true, reason: "trialing", status: "trialing", trialEndsAt: "2026-10-17T12:00:00.000Z" });
    s.advance(7 * DAY - 1); // one millisecond before the end
    expect((await s.as(member).entitlements()).json.data.items[0]).toMatchObject({ entitled: true, reason: "trialing" });
    s.advance(1); // exactly at the end: the trial is over
    expect((await s.as(member).entitlements()).json.data.items[0]).toMatchObject({ entitled: false, reason: "trial_ended" });
    // once only: asking again, or a longer trial setting later, never starts a second trial
    await s.as(admin).setRule("member", { paymentRequired: true, trialDays: 30, defaultPlanId: null });
    s.advance(DAY);
    const again = (await s.as(member).entitlements()).json.data.items[0];
    expect(again).toMatchObject({ entitled: false, reason: "trial_ended", trialEndsAt: "2026-10-17T12:00:00.000Z" });
    expect(s.world.subscriptions.size).toBe(1);
    // another account gets its own trial
    expect((await s.as(`user_${"B".repeat(10)}`).entitlements()).json.data.items[0]).toMatchObject({ entitled: true, reason: "trialing" });
  });

  it("AC6 plans validate, a price change is a new version, and subscribers keep the price they bought", async () => {
    const s = setup();
    const a = s.as(admin);
    for (const bad of [{ amountMinor: 3.5 }, { amountMinor: -1 }, { amountMinor: MAX_AMOUNT_MINOR + 1 }, { currency: "eur" }, { interval: "week" }, { name: "   " }, { name: `bad${String.fromCharCode(0)}` }, { accountType: "pet" }, { extra: true }]) {
      expect((await a.createPlan(newPlan(bad))).status, JSON.stringify(bad)).toBe(400);
    }
    const created = await a.createPlan(newPlan());
    expect(planSchema.safeParse(created.json.data).success).toBe(true);
    expect(created.json.data).toMatchObject({ active: false, price: { amountMinor: 300, currency: "usd", interval: "month" } });
    const id = created.json.data.id;
    await a.updatePlan(id, { active: true });
    await s.service.subscribe(s.ctxOf(member), { planId: id });
    const boughtPrice = s.world.subscriptions.get(`member:${member}`)!.priceId;
    s.advance(1000);
    const changed = await a.updatePlan(id, { price: { interval: "month", amountMinor: 500, currency: "usd" } });
    expect(changed.json.data.price.amountMinor).toBe(500);
    expect(s.world.prices.filter((p) => p.planId === id)).toHaveLength(2); // a new version, the old one kept
    expect(s.world.prices.find((p) => p.id === boughtPrice)?.amountMinor).toBe(300); // the subscriber's price is unchanged
    expect(s.world.subscriptions.get(`member:${member}`)!.priceId).toBe(boughtPrice);
    expect((await a.updatePlan(id, {})).status).toBe(400); // nothing to change
    expect((await a.updatePlan(randomUUID(), { active: false })).status).toBe(404);
    expect((await a.updatePlan("not-a-uuid", { active: false })).status).toBe(404);
    expect((await a.updatePlan(id, { name: "Renamed", active: false })).json.data).toMatchObject({ name: "Renamed", active: false });
  });

  it("AC7 an inactive plan cannot be subscribed to, and the proposals from the product plan start inactive", async () => {
    const s = setup();
    const plan = (await s.as(admin).createPlan(newPlan())).json.data;
    await expect(s.service.subscribe(s.ctxOf(member), { planId: plan.id })).rejects.toMatchObject({ code: "not_found" });
    expect(s.provider.started).toEqual([]);
    await s.as(admin).updatePlan(plan.id, { active: true });
    await s.service.subscribe(s.ctxOf(member), { planId: plan.id });
    expect(s.provider.started).toHaveLength(1);
    await s.as(admin).updatePlan(plan.id, { active: false });
    await expect(s.service.subscribe(s.ctxOf(`user_${"B".repeat(10)}`), { planId: plan.id })).rejects.toMatchObject({ code: "not_found" });
    // an organization plan is not a member plan
    const orgPlan = (await s.as(admin).createPlan(newPlan({ accountType: "organization", name: "Church plan" }))).json.data;
    await s.as(admin).updatePlan(orgPlan.id, { active: true });
    await expect(s.service.subscribe(s.ctxOf(`user_${"C".repeat(10)}`), { planId: orgPlan.id })).rejects.toMatchObject({ code: "not_found" });
  });

  it("AC7 the seeded proposals are in the migration, inactive (member $3 per month and $30 per year)", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const sql = readFileSync(join(__dirname, "..", "..", "drizzle", "0011_billing_plans_and_switches.sql"), "utf8");
    expect(sql).toMatch(/'member', 'Member, monthly \(proposed\)', false/);
    expect(sql).toMatch(/'member', 'Member, yearly \(proposed\)', false/);
    expect(sql).toMatch(/'month', 300, 'usd'/);
    expect(sql).toMatch(/'year', 3000, 'usd'/);
    expect(sql).toMatch(/"payment_required", "trial_days"\) VALUES \('member', false, 0\), \('organization', false, 0\)/);
  });

  it("AC8 coupons: create, edit, deactivate; each refusal has its own message; the price is whole cents and never below zero", async () => {
    const s = setup();
    const a = s.as(admin);
    for (const bad of [{ code: "AB", percentOff: 10 }, { code: "has space", percentOff: 10 }, { code: "OK1" }, { code: "OK1", percentOff: 10, amountOffMinor: 100, currency: "usd" }, { code: "OK1", percentOff: 0 }, { code: "OK1", percentOff: 101 }, { code: "OK1", percentOff: 10.5 }, { code: "OK1", amountOffMinor: 100 }, { code: "OK1", amountOffMinor: 1.5, currency: "usd" }, { code: "OK1", percentOff: 10, maxRedemptions: 0 }, { code: "OK1", percentOff: 10, expiresAt: "soon" }]) {
      expect((await a.createCoupon(bad)).status, JSON.stringify(bad)).toBe(400);
    }
    const plan = (await a.createPlan(newPlan({ amountMinor: 333 }))).json.data;
    await a.updatePlan(plan.id, { active: true });
    const welcome = await a.createCoupon({ code: " welcome10 ", percentOff: 10 });
    expect(couponSchema.safeParse(welcome.json.data).success).toBe(true);
    expect(welcome.json.data).toMatchObject({ code: "WELCOME10", percentOff: 10, active: true, redemptions: 0 }); // trimmed and upper-cased
    expect((await a.createCoupon({ code: "WELCOME10", percentOff: 5 })).status).toBe(409); // codes are unique
    const quote = await s.as(member).quote({ code: "welcome10", planId: plan.id });
    expect(quote.json.data).toEqual({ code: "WELCOME10", originalAmountMinor: 333, discountMinor: 33, finalAmountMinor: 300, currency: "usd" }); // 33.3 cents rounds to 33
    expect(discountMinor(5, { percentOff: 10, amountOffMinor: null })).toBe(1); // 0.5 rounds half up
    expect(discountMinor(100, { percentOff: 100, amountOffMinor: null })).toBe(100);
    expect(discountMinor(100, { percentOff: null, amountOffMinor: 5000 })).toBe(100); // never below zero
    const fixed = (await a.createCoupon({ code: "FIVEOFF", amountOffMinor: 500, currency: "usd" })).json.data;
    expect((await s.as(member).quote({ code: "FIVEOFF", planId: plan.id })).json.data).toMatchObject({ discountMinor: 333, finalAmountMinor: 0 });
    // distinct refusals
    const msg = async (code: string) => (await s.as(member).quote({ code, planId: plan.id })).json.error;
    expect((await msg("NOSUCH"))?.code).toBe("not_found");
    await a.updateCoupon(fixed.id, { active: false });
    expect((await msg("FIVEOFF"))?.message).toBe("This coupon is no longer active");
    const expiring = (await a.createCoupon({ code: "SOON", percentOff: 20, expiresAt: "2026-10-10T13:00:00Z" })).json.data;
    expect((await s.as(member).quote({ code: "SOON", planId: plan.id })).status).toBe(200);
    s.advance(DAY);
    expect((await msg("SOON"))?.message).toBe("This coupon has expired");
    await a.updateCoupon(expiring.id, { expiresAt: null });
    expect((await s.as(member).quote({ code: "SOON", planId: plan.id })).status).toBe(200); // editing reopens it
    const limited = (await a.createCoupon({ code: "ONLY1", percentOff: 50, maxRedemptions: 1 })).json.data;
    await s.service.subscribe(s.ctxOf(member), { planId: plan.id, couponCode: "ONLY1" });
    expect((await msg("ONLY1"))?.message).toBe("You have already used this coupon");
    const other = `user_${"B".repeat(10)}`;
    const limitReached = await s.as(other).quote({ code: "ONLY1", planId: plan.id });
    expect(limitReached.json.error?.message).toBe("This coupon has reached its limit");
    expect((await a.coupons()).json.data.items.find((c: { id: string }) => c.id === limited.id).redemptions).toBe(1);
    expect((await a.updateCoupon(limited.id, {})).status).toBe(400);
    expect((await a.updateCoupon(randomUUID(), { active: false })).status).toBe(404);
    // an inactive or missing plan cannot be quoted
    expect((await s.as(member).quote({ code: "SOON", planId: randomUUID() })).status).toBe(404);
  });

  it("AC8 a coupon use is checked and recorded in one step: the limit holds when two accounts race", async () => {
    const s = setup();
    const coupon = await s.repo.createCoupon({ code: "RACE", percentOff: 10, amountOffMinor: null, currency: null, expiresAt: null, maxRedemptions: 1 }, admin);
    const attempts = await Promise.all([1, 2, 3].map((n) => s.repo.useCoupon({ couponId: coupon.id, accountType: "member", accountId: `user_${n}`, now: new Date() })));
    expect(attempts.filter(Boolean)).toHaveLength(1);
  });

  it("AC9 every change writes an audit entry (who, when, from and to); the log is read-only through the app", async () => {
    const s = setup();
    const a = s.as(admin);
    const plan = (await a.createPlan(newPlan())).json.data;
    s.advance(1000);
    await a.updatePlan(plan.id, { active: true, price: { interval: "year", amountMinor: 3000, currency: "usd" } });
    await a.setRule("member", { paymentRequired: true, trialDays: 30, defaultPlanId: plan.id });
    const coupon = (await a.createCoupon({ code: "AUDITED", percentOff: 15 })).json.data;
    await a.updateCoupon(coupon.id, { active: false });
    const log = (await a.audit()).json.data.items;
    expect(log.map((e: { action: string }) => e.action)).toEqual(["billing.coupon.update", "billing.coupon.create", "billing.rule.update", "billing.plan.update", "billing.plan.create"]); // newest first
    for (const entry of log) {
      expect(entry.actorId).toBe(admin);
      expect(new Date(entry.at).getTime()).toBeGreaterThan(0);
      expect(() => JSON.parse(entry.detail)).not.toThrow();
    }
    const rule = JSON.parse(log[2].detail);
    expect(rule.before).toEqual({ accountType: "member", paymentRequired: false, trialDays: 0, defaultPlanId: null });
    expect(rule.after).toMatchObject({ paymentRequired: true, trialDays: 30 });
    expect(JSON.parse(log[3].detail).before).toMatchObject({ active: false, price: { amountMinor: 300 } });
    expect((await a.audit("?limit=2")).json.data.items).toHaveLength(2);
    expect((await a.audit("?limit=0")).status).toBe(400);
    expect((await a.audit("?limit=500")).status).toBe(400);
    // failed or rejected changes leave nothing behind
    const before = s.world.audit.length;
    await s.as(member).setRule("member", { paymentRequired: true, trialDays: 0, defaultPlanId: null });
    await a.setRule("member", { paymentRequired: true, trialDays: 999, defaultPlanId: null });
    expect(s.world.audit).toHaveLength(before);
    // the application offers no way to edit or delete audit entries
    const routes = billingRoutes(createApiRoute({ getUserId: vi.fn(), onUnexpected: vi.fn() }), () => s.service);
    expect(Object.keys(routes.audit)).toEqual(["GET"]);
  });

  it("AC10 entitlement is derived on the server: the route takes no input and the answer matches the stored state", async () => {
    const s = setup();
    const withBody = billingRoutes(createApiRoute({ getUserId: async () => member, onUnexpected: vi.fn() }), () => s.service);
    const r = await withBody.entitlements.GET(new Request(`${base}/me/entitlements?entitled=true`, { method: "GET", headers: { "x-entitled": "true" } }));
    const json = (await r.json()) as Json;
    expect(json.data.items[0].reason).toBe("not_required");
    await s.as(admin).setRule("member", { paymentRequired: true, trialDays: 0, defaultPlanId: null });
    const after = (await (await withBody.entitlements.GET(new Request(`${base}/me/entitlements?entitled=true`, { method: "GET", headers: { "x-entitled": "true", authorization: "Bearer entitled" } }))).json()) as Json;
    expect(after.data.items[0].entitled).toBe(false); // nothing the client sends changes the answer
  });

  it("AC12 money is whole minor units plus a currency in every contract: a decimal is rejected", () => {
    expect(moneyAmountSchema.safeParse(299).success).toBe(true);
    expect(moneyAmountSchema.safeParse(2.99).success).toBe(false);
    expect(moneyAmountSchema.safeParse("299").success).toBe(false);
    expect(moneyAmountSchema.safeParse(-1).success).toBe(false);
    expect(createPlanSchema.safeParse(newPlan({ amountMinor: 2.99 })).success).toBe(false);
    expect(createPlanSchema.safeParse(newPlan({ currency: undefined })).success).toBe(false);
    expect(createPlanSchema.safeParse(newPlan({ price: 3 })).success).toBe(false); // there is no decimal "price" field
  });
});
