import { assertDestructiveAllowed, parseDatabaseEnv } from "@signalone/shared";
import { eq, inArray, like } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createBillingRepo } from "./billing";
import { createDb } from "./client";
import { createMemberRepo } from "./member";
import { auditLog, billingCoupon, billingCouponUse, billingPlan, billingPrice, billingRule, billingSubscription, paymentEvent } from "./schema";

// Database-backed integration tests for billing (S10, /docs/automation/integration.md). They run ONLY via
// `pnpm --filter web test:integration`, never in `pnpm test`, and are fail-closed: DATABASE_ENV must be
// explicitly `dev` or `qa`; STAGE and PROD are refused. The migrations must already be applied
// (`pnpm --filter web db:migrate -- --env=dev`). They prove the real SQL does what the in-memory fake the
// acceptance tests use does: atomic change-and-audit, a coupon limit that holds under a race, and one trial.
const config = parseDatabaseEnv(process.env);
assertDestructiveAllowed(config.databaseEnv, ["dev", "qa"], "test:integration");
if (process.env.APP_ENV && process.env.APP_ENV !== config.databaseEnv) {
  throw new Error("test:integration: APP_ENV must equal DATABASE_ENV; refusing.");
}
if (process.env.VERCEL_ENV) throw new Error("test:integration: must not run on Vercel; refusing.");

const db = createDb(config.databaseUrl);
const repo = createBillingRepo(db);
const PREFIX = "itest-s10-";
const admin = `user_${PREFIX}admin`;
const people = Array.from({ length: 4 }, (_, i) => `user_${PREFIX}p${i}`);
const planIds: string[] = [];
const couponCodes: string[] = [];

afterAll(async () => {
  if (planIds.length > 0) {
    await db.delete(billingSubscription).where(inArray(billingSubscription.planId, planIds));
    await db.delete(billingPrice).where(inArray(billingPrice.planId, planIds));
    await db.delete(billingPlan).where(inArray(billingPlan.id, planIds));
  }
  await db.delete(billingSubscription).where(inArray(billingSubscription.accountId, people));
  const coupons = couponCodes.length > 0 ? await db.select({ id: billingCoupon.id }).from(billingCoupon).where(inArray(billingCoupon.code, couponCodes)) : [];
  if (coupons.length > 0) {
    await db.delete(billingCouponUse).where(inArray(billingCouponUse.couponId, coupons.map((c) => c.id)));
    await db.delete(billingCoupon).where(inArray(billingCoupon.id, coupons.map((c) => c.id)));
  }
  await db.delete(paymentEvent).where(like(paymentEvent.eventId, `${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `%${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.subject, `%${PREFIX}%`));
});

describe("billing repo (real database)", () => {
  it("S10 AC2 AC9 a rule change and its audit entry are saved together", async () => {
    const before = await repo.getRule("organization");
    try {
      const saved = await repo.updateRule("organization", { paymentRequired: true, trialDays: 14, defaultPlanId: null }, admin, before);
      expect(saved).toEqual({ accountType: "organization", paymentRequired: true, trialDays: 14, defaultPlanId: null });
      expect(await repo.getRule("organization")).toEqual(saved);
      const entry = (await repo.listAudit(50)).find((e) => e.actorId === admin && e.action === "billing.rule.update");
      expect(entry).toBeDefined();
      expect(JSON.parse(entry?.detail ?? "{}").before).toEqual(before);
    } finally {
      await repo.updateRule("organization", { paymentRequired: before.paymentRequired, trialDays: before.trialDays, defaultPlanId: before.defaultPlanId }, admin, before);
    }
  });

  it("S10 AC6 AC9 a plan starts inactive; a price change adds a version and keeps the old one", async () => {
    const plan = await repo.createPlan({ accountType: "member", name: `${PREFIX}plan`, price: { interval: "month", amountMinor: 300, currency: "usd" } }, admin);
    planIds.push(plan.id);
    expect(plan).toMatchObject({ active: false, price: { amountMinor: 300, interval: "month", currency: "usd" } });
    await new Promise((resolve) => setTimeout(resolve, 20));
    const changed = await repo.updatePlan(plan.id, { active: true, price: { interval: "month", amountMinor: 500, currency: "usd" } }, admin, plan);
    expect(changed).toMatchObject({ active: true, price: { amountMinor: 500 } });
    const versions = await db.select().from(billingPrice).where(eq(billingPrice.planId, plan.id));
    expect(versions.map((v) => v.amountMinor).sort()).toEqual([300, 500]);
    expect((await repo.listAudit(50)).filter((e) => e.subject === `plan:${plan.id}`).map((e) => e.action).sort()).toEqual(["billing.plan.create", "billing.plan.update"]);
  });

  it("S10 AC6 the database refuses an out-of-range amount and a trial outside 0 to 365", async () => {
    const plan = await repo.createPlan({ accountType: "member", name: `${PREFIX}range`, price: { interval: "month", amountMinor: 100, currency: "usd" } }, admin);
    planIds.push(plan.id);
    await expect(db.insert(billingPrice).values({ planId: plan.id, interval: "month", amountMinor: 1_000_001, currency: "usd" })).rejects.toThrow();
    await expect(db.insert(billingPrice).values({ planId: plan.id, interval: "month", amountMinor: -1, currency: "usd" })).rejects.toThrow();
    await expect(db.insert(billingRule).values({ accountType: `${PREFIX}x`, trialDays: 366 })).rejects.toThrow();
  });

  it("S10 AC8 a duplicate coupon code is refused and a coupon is exactly one kind of discount", async () => {
    const code = `${PREFIX.toUpperCase()}DUP`;
    couponCodes.push(code);
    await repo.createCoupon({ code, percentOff: 10, amountOffMinor: null, currency: null, expiresAt: null, maxRedemptions: null }, admin);
    await expect(repo.createCoupon({ code, percentOff: 10, amountOffMinor: null, currency: null, expiresAt: null, maxRedemptions: null }, admin)).rejects.toMatchObject({ kind: "unique_violation" });
    const both = `${PREFIX.toUpperCase()}BOTH`;
    couponCodes.push(both);
    await expect(db.insert(billingCoupon).values({ code: both, percentOff: 10, amountOffMinor: 100, currency: "usd" })).rejects.toThrow();
    await expect(db.insert(billingCoupon).values({ code: both, percentOff: 101 })).rejects.toThrow();
  });

  it("S10 AC8 a coupon with a limit of 2 is used by at most 2 of 4 accounts racing, and never twice by one", async () => {
    const code = `${PREFIX.toUpperCase()}LIMIT`;
    couponCodes.push(code);
    const coupon = await repo.createCoupon({ code, percentOff: 50, amountOffMinor: null, currency: null, expiresAt: null, maxRedemptions: 2 }, admin);
    const results = await Promise.all(people.map((accountId) => repo.useCoupon({ couponId: coupon.id, accountType: "member", accountId, now: new Date() })));
    expect(results.filter(Boolean)).toHaveLength(2);
    expect((await repo.getCoupon(coupon.id))?.redemptions).toBe(2);
    const winner = people[results.indexOf(true)];
    expect(await repo.useCoupon({ couponId: coupon.id, accountType: "member", accountId: winner, now: new Date() })).toBe(false); // not twice
    expect(await repo.hasUsedCoupon(coupon.id, "member", winner)).toBe(true);
  });

  it("S10 AC8 an expired or inactive coupon cannot be used", async () => {
    const code = `${PREFIX.toUpperCase()}EXP`;
    couponCodes.push(code);
    const coupon = await repo.createCoupon({ code, percentOff: 20, amountOffMinor: null, currency: null, expiresAt: new Date(Date.now() + 60_000), maxRedemptions: null }, admin);
    expect(await repo.useCoupon({ couponId: coupon.id, accountType: "member", accountId: people[0], now: new Date(Date.now() + 120_000) })).toBe(false); // after expiry
    await repo.updateCoupon(coupon.id, { active: false }, admin, coupon);
    expect(await repo.useCoupon({ couponId: coupon.id, accountType: "member", accountId: people[0], now: new Date() })).toBe(false);
  });

  it("S10 AC5 a trial starts once per account and type", async () => {
    const first = await repo.startTrial({ accountType: "member", accountId: people[1], trialEndsAt: new Date(Date.now() + 86_400_000) });
    const second = await repo.startTrial({ accountType: "member", accountId: people[1], trialEndsAt: new Date(Date.now() + 999 * 86_400_000) });
    expect(second.id).toBe(first.id);
    expect(second.trialEndsAt?.getTime()).toBe(first.trialEndsAt?.getTime());
    expect(await repo.getSubscription("member", people[1])).toMatchObject({ status: "trialing" });
  });

  it("S10 AC13 deleting a member removes their subscription and coupon uses, and unlinks them from the audit log", async () => {
    const leaver = `user_${PREFIX}leaver`;
    const code = `${PREFIX.toUpperCase()}LEAVE`;
    couponCodes.push(code);
    const coupon = await repo.createCoupon({ code, percentOff: 10, amountOffMinor: null, currency: null, expiresAt: null, maxRedemptions: null }, leaver);
    await repo.useCoupon({ couponId: coupon.id, accountType: "member", accountId: leaver, now: new Date() });
    await repo.startTrial({ accountType: "member", accountId: leaver, trialEndsAt: new Date(Date.now() + 86_400_000) });
    await createMemberRepo(db).eraseAll(leaver);
    expect(await repo.getSubscription("member", leaver)).toBeNull();
    expect(await repo.hasUsedCoupon(coupon.id, "member", leaver)).toBe(false);
    expect((await repo.listAudit(200)).some((e) => e.actorId === leaver)).toBe(false); // the audit entry stays, without the person
  });
});

describe("payment notifications (real database, S11)", () => {
  const holder = `user_${PREFIX}payer`;
  const at = (minutes: number) => new Date(Date.UTC(2026, 9, 10, 12, minutes, 0));
  const ref = `${PREFIX}sub-${crypto.randomUUID()}`;
  const checkout = (minutes: number, over: Partial<{ subscriptionRef: string; customerRef: string | null }> = {}) => ({ accountType: "member", accountId: holder, planId: crypto.randomUUID(), priceId: crypto.randomUUID(), subscriptionRef: ref, customerRef: `${PREFIX}cus`, at: at(minutes), ...over });

  it("S11 AC6 an event id is recorded once, and a known one is found", async () => {
    const id = `${PREFIX}evt-${crypto.randomUUID()}`;
    expect(await repo.hasPaymentEvent(id)).toBe(false);
    await repo.recordPaymentEvent(id, "checkout_completed");
    await repo.recordPaymentEvent(id, "payment_failed"); // the same id again is one entry
    expect(await repo.hasPaymentEvent(id)).toBe(true);
    expect((await db.select().from(paymentEvent).where(like(paymentEvent.eventId, id))).length).toBe(1);
  });

  it("S11 AC7 checkout completed makes the subscription active with the provider's references", async () => {
    await repo.applyCheckoutCompleted(checkout(1));
    expect(await repo.getSubscription("member", holder)).toMatchObject({ status: "active", providerRef: ref, providerCustomerRef: `${PREFIX}cus`, trialEndsAt: null });
  });

  it("S11 AC6 an older notification never overwrites a newer state, and a newer one applies", async () => {
    expect(await repo.setStatusByProviderRef(ref, "cancelled", at(5))).toBe(true);
    expect((await repo.getSubscription("member", holder))?.status).toBe("cancelled");
    expect(await repo.setStatusByProviderRef(ref, "active", at(3))).toBe(true); // known, but older: changes nothing
    expect((await repo.getSubscription("member", holder))?.status).toBe("cancelled");
    await repo.applyCheckoutCompleted(checkout(2, { subscriptionRef: `${ref}-old`, customerRef: "cus_old" })); // an old checkout must not overwrite
    expect((await repo.getSubscription("member", holder))?.providerRef).toBe(ref);
    expect(await repo.setStatusByProviderRef(ref, "past_due", at(9))).toBe(true);
    expect((await repo.getSubscription("member", holder))?.status).toBe("past_due");
  });

  it("S11 AC7 an unknown subscription reference is reported as unknown and changes nothing", async () => {
    expect(await repo.setStatusByProviderRef(`${PREFIX}nobody-${crypto.randomUUID()}`, "cancelled", at(20))).toBe(false);
  });

  it("S11 AC11 deleting the member removes their subscription and customer reference", async () => {
    expect(await repo.getSubscription("member", holder)).not.toBeNull();
    await createMemberRepo(db).eraseAll(holder);
    expect(await repo.getSubscription("member", holder)).toBeNull();
  });
});


describe("trial grants (real database, S13)", () => {
  const grantee = `user_${PREFIX}grantee`;
  const stranger = `user_${PREFIX}nobody`;
  const at = (days: number) => new Date(Date.UTC(2026, 9, 12, 12, 0, 0) + days * 24 * 3600 * 1000);
  const grant = (userId: string, days: number) => repo.grantTrial({ userId, trialEndsAt: at(days), actorId: admin, detail: { days, reason: "itest" } });
  const auditCount = async () => (await db.select().from(auditLog).where(eq(auditLog.subject, `member:${grantee}`))).length;

  afterAll(async () => {
    await db.delete(billingSubscription).where(eq(billingSubscription.accountId, grantee));
    await db.delete(auditLog).where(eq(auditLog.subject, `member:${grantee}`));
    await createMemberRepo(db).eraseAll(grantee);
  });

  it("S13 AC5 only a member with a profile exists for a grant", async () => {
    expect(await repo.memberExists(stranger)).toBe(false);
    await createMemberRepo(db).ensureProfile(grantee);
    expect(await repo.memberExists(grantee)).toBe(true);
  });

  it("S13 AC3 a grant creates a trial, and a second grant replaces its end", async () => {
    expect(await grant(grantee, 10)).toBe(true);
    expect((await repo.getSubscription("member", grantee))?.trialEndsAt?.getTime()).toBe(at(10).getTime());
    expect(await grant(grantee, 20)).toBe(true);
    const row = await repo.getSubscription("member", grantee);
    expect(row?.status).toBe("trialing");
    expect(row?.trialEndsAt?.getTime()).toBe(at(20).getTime());
  });

  it("S13 AC6 each grant wrote exactly one audit entry in the same statement", async () => {
    expect(await auditCount()).toBe(2);
  });

  it("S13 AC4 an active or past-due subscription is left alone and writes no audit entry", async () => {
    for (const status of ["active", "past_due"]) {
      await db.update(billingSubscription).set({ status, trialEndsAt: null }).where(eq(billingSubscription.accountId, grantee));
      const before = await auditCount();
      expect(await grant(grantee, 5)).toBe(false);
      const row = await repo.getSubscription("member", grantee);
      expect(row?.status).toBe(status);
      expect(row?.trialEndsAt).toBeNull();
      expect(await auditCount()).toBe(before);
    }
  });
});

describe("flagship places (real database, S14)", () => {
  const orgs = Array.from({ length: 4 }, () => crypto.randomUUID());
  const filler: string[] = [];
  const enable = (organizationId: string) => repo.enableFlagship({ organizationId, actorId: admin, detail: { reason: "itest" } });
  const rowOf = (id: string) => repo.getSubscription("organization", id);
  const auditFor = async (id: string) => (await db.select().from(auditLog).where(eq(auditLog.subject, `organization:${id}`))).length;

  afterAll(async () => {
    const ids = [...orgs, ...filler];
    await db.delete(billingSubscription).where(inArray(billingSubscription.accountId, ids));
    await db.delete(auditLog).where(inArray(auditLog.subject, ids.map((i) => `organization:${i}`)));
  });

  it("S14 AC9 enabling takes a numbered place, a repeat keeps the same place, and disabling removes the row", async () => {
    expect(await enable(orgs[0])).toBe(true);
    const first = await rowOf(orgs[0]);
    expect(first).toMatchObject({ status: "active", providerRef: null, planId: null });
    expect(first?.flagshipSlot).toBeGreaterThanOrEqual(1);
    expect(await enable(orgs[0])).toBe(true);
    expect((await rowOf(orgs[0]))?.flagshipSlot).toBe(first?.flagshipSlot);
    expect(await repo.disableFlagship({ organizationId: orgs[0], actorId: admin, detail: { reason: "itest" } })).toBe(true);
    expect(await rowOf(orgs[0])).toBeNull();
    expect(await repo.disableFlagship({ organizationId: orgs[0], actorId: admin, detail: {} })).toBe(false); // nothing to remove, no audit entry
  });

  it("S14 AC11 each change wrote exactly one audit entry (enable twice, disable once)", async () => {
    expect(await auditFor(orgs[0])).toBe(3);
  });

  it("S14 AC8 a church with a provider subscription is left alone", async () => {
    await repo.applyCheckoutCompleted({ accountType: "organization", accountId: orgs[1], planId: crypto.randomUUID(), priceId: crypto.randomUUID(), subscriptionRef: `${PREFIX}org-sub-${crypto.randomUUID()}`, customerRef: "cus_itest", at: new Date() });
    expect(await enable(orgs[1])).toBe(false);
    expect((await rowOf(orgs[1]))?.flagshipSlot).toBeNull();
    expect(await auditFor(orgs[1])).toBe(0);
  });

  it("S14 AC10 a provider event never changes a flagship church", async () => {
    expect(await enable(orgs[2])).toBe(true);
    await repo.applyCheckoutCompleted({ accountType: "organization", accountId: orgs[2], planId: crypto.randomUUID(), priceId: crypto.randomUUID(), subscriptionRef: `${PREFIX}stray-${crypto.randomUUID()}`, customerRef: null, at: new Date() });
    expect(await rowOf(orgs[2])).toMatchObject({ providerRef: null, status: "active" });
  });

  it("S14 AC9 the 51st place is refused, and two admins racing for the last place cannot both win", async () => {
    const used = await repo.flagshipUsed();
    for (let i = used; i < 49; i++) {
      const id = crypto.randomUUID();
      filler.push(id);
      expect(await enable(id)).toBe(true);
    }
    expect(await repo.flagshipUsed()).toBe(49);
    const rival = crypto.randomUUID();
    const late = crypto.randomUUID();
    filler.push(rival, late);
    const racers = await Promise.allSettled([enable(orgs[3]), enable(rival)]);
    expect(await repo.flagshipUsed()).toBe(50);
    expect(racers.filter((r) => r.status === "fulfilled" && r.value === true)).toHaveLength(1);
    expect(await enable(late)).toBe(false);
    expect(await repo.flagshipUsed()).toBe(50);
  });
});
