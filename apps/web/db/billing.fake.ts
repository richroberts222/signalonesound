import { randomUUID } from "node:crypto";

import type { BillingAuditRow, BillingRepo, CouponRow, PlanRow, PriceInput, PriceRow, RuleRow, SubscriptionRow } from "./billing";
import { DatabaseError } from "./errors";

// In-memory billing repo that behaves like the real one (db/billing.ts): defaults when a rule is missing,
// a price change adds a version, a coupon use is checked and recorded in one step, a trial starts once,
// and every admin change writes its audit entry together with the change. The integration suite runs the
// same expectations against the real database.
export type BillingWorld = {
  rules: Map<string, RuleRow>;
  plans: Map<string, { id: string; accountType: string; name: string; active: boolean; createdAt: Date }>;
  prices: PriceRow[];
  coupons: Map<string, Omit<CouponRow, "redemptions">>;
  uses: { couponId: string; accountType: string; accountId: string }[];
  subscriptions: Map<string, SubscriptionRow>;
  audit: BillingAuditRow[];
  paymentEvents: Set<string>;
};

export const emptyBillingWorld = (): BillingWorld => ({ rules: new Map(), plans: new Map(), prices: [], coupons: new Map(), uses: [], subscriptions: new Map(), audit: [], paymentEvents: new Set() });

export function createFakeBillingRepo(world: BillingWorld, now: () => Date = () => new Date()): BillingRepo {
  const noRule = (accountType: string): RuleRow => ({ accountType, paymentRequired: false, trialDays: 0, defaultPlanId: null });
  const latest = (planId: string): PriceRow | null => [...world.prices].filter((p) => p.planId === planId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || (a.id < b.id ? 1 : -1))[0] ?? null;
  const plan = (id: string): PlanRow | null => {
    const row = world.plans.get(id);
    return row ? { ...row, price: latest(id) } : null;
  };
  const coupon = (row: Omit<CouponRow, "redemptions">): CouponRow => ({ ...row, redemptions: world.uses.filter((u) => u.couponId === row.id).length });
  const record = (actorId: string, action: string, subject: string, detail: unknown) => world.audit.push({ id: randomUUID(), actorId, action, subject, detail: JSON.stringify(detail), at: now() });
  const addPrice = (planId: string, price: PriceInput) => world.prices.push({ id: randomUUID(), planId, ...price, createdAt: now() });
  const key = (type: string, id: string) => `${type}:${id}`;

  return {
    getRules: async () => (["member", "organization"] as const).map((t) => world.rules.get(t) ?? noRule(t)),
    getRule: async (t) => world.rules.get(t) ?? noRule(t),
    updateRule: async (accountType, next, actorId, before) => {
      const row = { accountType, ...next };
      world.rules.set(accountType, row);
      record(actorId, "billing.rule.update", `rule:${accountType}`, { before, after: row });
      return row;
    },
    listPlans: async () => [...world.plans.values()].sort((a, b) => a.accountType.localeCompare(b.accountType) || a.createdAt.getTime() - b.createdAt.getTime()).map((p) => plan(p.id) as PlanRow),
    getPlan: async (id) => plan(id),
    createPlan: async (input, actorId) => {
      const id = randomUUID();
      world.plans.set(id, { id, accountType: input.accountType, name: input.name, active: false, createdAt: now() });
      addPrice(id, input.price);
      record(actorId, "billing.plan.create", `plan:${id}`, { after: { ...input, active: false } });
      return plan(id) as PlanRow;
    },
    updatePlan: async (id, change, actorId, before) => {
      const row = world.plans.get(id);
      if (row) {
        if (change.name !== undefined) row.name = change.name;
        if (change.active !== undefined) row.active = change.active;
      }
      if (change.price) addPrice(id, change.price);
      record(actorId, "billing.plan.update", `plan:${id}`, { before: { name: before.name, active: before.active, price: before.price && { interval: before.price.interval, amountMinor: before.price.amountMinor, currency: before.price.currency } }, after: change });
      return plan(id) as PlanRow;
    },
    listCoupons: async () => [...world.coupons.values()].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).map(coupon),
    getCoupon: async (id) => {
      const row = world.coupons.get(id);
      return row ? coupon(row) : null;
    },
    getCouponByCode: async (code) => {
      const row = [...world.coupons.values()].find((c) => c.code === code);
      return row ? coupon(row) : null;
    },
    createCoupon: async (input, actorId) => {
      if ([...world.coupons.values()].some((c) => c.code === input.code)) throw new DatabaseError("unique_violation", "billing.createCoupon", null);
      const row = { id: randomUUID(), ...input, active: true, createdAt: now() };
      world.coupons.set(row.id, row);
      record(actorId, "billing.coupon.create", `coupon:${input.code}`, { after: { ...input, expiresAt: input.expiresAt?.toISOString() ?? null } });
      return coupon(row);
    },
    updateCoupon: async (id, change, actorId, before) => {
      const row = world.coupons.get(id);
      if (row) Object.assign(row, change);
      record(actorId, "billing.coupon.update", `coupon:${before.code}`, { before: { active: before.active, expiresAt: before.expiresAt?.toISOString() ?? null, maxRedemptions: before.maxRedemptions }, after: { ...change, expiresAt: change.expiresAt === undefined ? undefined : (change.expiresAt?.toISOString() ?? null) } });
      return coupon(world.coupons.get(id) as Omit<CouponRow, "redemptions">);
    },
    useCoupon: async ({ couponId, accountType, accountId, now: at }) => {
      const row = world.coupons.get(couponId);
      if (!row || !row.active) return false;
      if (row.expiresAt && row.expiresAt.getTime() <= at.getTime()) return false;
      if (row.maxRedemptions !== null && world.uses.filter((u) => u.couponId === couponId).length >= row.maxRedemptions) return false;
      if (world.uses.some((u) => u.couponId === couponId && u.accountType === accountType && u.accountId === accountId)) return false;
      world.uses.push({ couponId, accountType, accountId });
      return true;
    },
    hasUsedCoupon: async (couponId, accountType, accountId) => world.uses.some((u) => u.couponId === couponId && u.accountType === accountType && u.accountId === accountId),
    getSubscription: async (t, id) => world.subscriptions.get(key(t, id)) ?? null,
    startTrial: async ({ accountType, accountId, trialEndsAt }) => {
      const existing = world.subscriptions.get(key(accountType, accountId));
      if (existing) return existing;
      const row: SubscriptionRow = { id: randomUUID(), accountType, accountId, planId: null, priceId: null, status: "trialing", trialEndsAt, providerRef: null, providerCustomerRef: null, providerEventAt: null, createdAt: now() };
      world.subscriptions.set(key(accountType, accountId), row);
      return row;
    },
    saveSubscription: async (input) => {
      const k = key(input.accountType, input.accountId);
      const row: SubscriptionRow = { id: world.subscriptions.get(k)?.id ?? randomUUID(), ...input, trialEndsAt: null, providerCustomerRef: null, providerEventAt: null, createdAt: world.subscriptions.get(k)?.createdAt ?? now() };
      world.subscriptions.set(k, row);
      return row;
    },
    hasPaymentEvent: async (id) => world.paymentEvents.has(id),
    recordPaymentEvent: async (id) => void world.paymentEvents.add(id),
    applyCheckoutCompleted: async ({ accountType, accountId, planId, priceId, subscriptionRef, customerRef, at }) => {
      const k = key(accountType, accountId);
      const existing = world.subscriptions.get(k);
      if (existing?.providerEventAt && existing.providerEventAt.getTime() > at.getTime()) return; // a newer notification already set it
      world.subscriptions.set(k, { id: existing?.id ?? randomUUID(), accountType, accountId, planId, priceId, status: "active", trialEndsAt: null, providerRef: subscriptionRef, providerCustomerRef: customerRef, providerEventAt: at, createdAt: existing?.createdAt ?? now() });
    },
    setStatusByProviderRef: async (ref, status, at) => {
      const row = [...world.subscriptions.values()].find((r) => r.providerRef === ref);
      if (!row) return false;
      if (row.providerEventAt && row.providerEventAt.getTime() > at.getTime()) return true; // known, but an older notification changes nothing
      row.status = status;
      row.providerEventAt = at;
      return true;
    },
    listAudit: async (limit) => [...world.audit].reverse().slice(0, limit),
  };
}
