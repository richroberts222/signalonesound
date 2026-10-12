import { randomUUID } from "node:crypto";

import type { BillingAuditRow, BillingRepo, CouponRow, PerkRow, PlanRow, PriceInput, PriceRow, RuleRow, SubscriptionRow } from "./billing";
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
  /** Known members (sign-in ids) for the trial-grant existence check. */
  members: Set<string>;
  perks: Map<string, PerkRow>;
  /** plan id to the ids of the perks it includes (S20) */
  planPerks: Map<string, Set<string>>;
};

export const emptyBillingWorld = (): BillingWorld => ({ rules: new Map(), plans: new Map(), prices: [], coupons: new Map(), uses: [], subscriptions: new Map(), audit: [], paymentEvents: new Set(), members: new Set(), perks: new Map(), planPerks: new Map() });

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
    listPerks: async () => [...world.perks.values()].sort((a, b) => a.accountType.localeCompare(b.accountType) || a.createdAt.getTime() - b.createdAt.getTime() || a.key.localeCompare(b.key)),
    getPerk: async (id) => world.perks.get(id) ?? null,
    createPerk: async (input, actorId) => {
      if ([...world.perks.values()].some((p) => p.key === input.key)) throw new DatabaseError("unique_violation", "billing.createPerk", null);
      const row: PerkRow = { id: randomUUID(), ...input, active: true, createdAt: now() };
      world.perks.set(row.id, row);
      record(actorId, "billing.perk.create", `perk:${input.key}`, { after: input });
      return row;
    },
    updatePerk: async (id, change, actorId, before) => {
      const row = world.perks.get(id) as PerkRow;
      Object.assign(row, change);
      record(actorId, "billing.perk.update", `perk:${before.key}`, { before: { label: before.label, description: before.description, active: before.active }, after: change });
      return row;
    },
    listPlanPerkIds: async () => [...world.planPerks].map(([planId, perkIds]) => ({ planId, perkIds: [...perkIds] })),
    setPlanPerks: async (planId, perkIds, actorId) => {
      world.planPerks.set(planId, new Set(perkIds));
      record(actorId, "billing.plan.perks", `plan:${planId}`, { perkIds });
    },
    listActivePlanPerks: async () =>
      [...world.planPerks].flatMap(([planId, ids]) => [...ids].map((id) => world.perks.get(id)).filter((p): p is PerkRow => !!p && p.active).map((p) => ({ planId, key: p.key, label: p.label, description: p.description }))),
    listActivePerksOfType: async (accountType) => [...world.perks.values()].filter((p) => p.accountType === accountType && p.active),
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
      const row: SubscriptionRow = { id: randomUUID(), accountType, accountId, planId: null, priceId: null, status: "trialing", trialEndsAt, providerRef: null, providerCustomerRef: null, providerEventAt: null, flagshipSlot: null, createdAt: now() };
      world.subscriptions.set(key(accountType, accountId), row);
      return row;
    },
    memberExists: async (userId) => world.members.has(userId),
    grantTrial: async ({ userId, trialEndsAt, actorId, detail }) => {
      const k = key("member", userId);
      const existing = world.subscriptions.get(k);
      if (existing && (existing.status === "active" || existing.status === "past_due")) return false;
      world.subscriptions.set(k, existing ? { ...existing, status: "trialing", trialEndsAt } : { id: randomUUID(), accountType: "member", accountId: userId, planId: null, priceId: null, status: "trialing", trialEndsAt, providerRef: null, providerCustomerRef: null, providerEventAt: null, flagshipSlot: null, createdAt: now() });
      record(actorId, "billing.trial.grant", `member:${userId}`, detail);
      return true;
    },
    flagshipUsed: async () => [...world.subscriptions.values()].filter((s) => s.flagshipSlot !== null).length,
    enableFlagship: async ({ organizationId, actorId, detail }) => {
      const k = key("organization", organizationId);
      const existing = world.subscriptions.get(k);
      if (existing?.providerRef) return false;
      let slot = existing?.flagshipSlot ?? null;
      if (slot === null) {
        const taken = new Set([...world.subscriptions.values()].map((s) => s.flagshipSlot).filter((n): n is number => n !== null));
        for (let n = 1; n <= 50; n++) if (!taken.has(n)) { slot = n; break; }
        if (slot === null) return false;
      }
      world.subscriptions.set(k, { id: existing?.id ?? randomUUID(), accountType: "organization", accountId: organizationId, planId: null, priceId: null, status: "active", trialEndsAt: null, providerRef: null, providerCustomerRef: null, providerEventAt: existing?.providerEventAt ?? null, flagshipSlot: slot, createdAt: existing?.createdAt ?? now() });
      record(actorId, "billing.flagship.enable", `organization:${organizationId}`, detail);
      return true;
    },
    disableFlagship: async ({ organizationId, actorId, detail }) => {
      const k = key("organization", organizationId);
      if (world.subscriptions.get(k)?.flagshipSlot == null) return false;
      world.subscriptions.delete(k);
      record(actorId, "billing.flagship.disable", `organization:${organizationId}`, detail);
      return true;
    },
    saveSubscription: async (input) => {
      const k = key(input.accountType, input.accountId);
      const row: SubscriptionRow = { id: world.subscriptions.get(k)?.id ?? randomUUID(), ...input, trialEndsAt: null, providerCustomerRef: null, providerEventAt: null, flagshipSlot: world.subscriptions.get(k)?.flagshipSlot ?? null, createdAt: world.subscriptions.get(k)?.createdAt ?? now() };
      world.subscriptions.set(k, row);
      return row;
    },
    hasPaymentEvent: async (id) => world.paymentEvents.has(id),
    recordPaymentEvent: async (id) => void world.paymentEvents.add(id),
    applyCheckoutCompleted: async ({ accountType, accountId, planId, priceId, subscriptionRef, customerRef, at }) => {
      const k = key(accountType, accountId);
      const existing = world.subscriptions.get(k);
      if (existing?.flagshipSlot != null) return; // a flagship church is never changed by a provider event
      if (existing?.providerEventAt && existing.providerEventAt.getTime() > at.getTime()) return; // a newer notification already set it
      world.subscriptions.set(k, { id: existing?.id ?? randomUUID(), accountType, accountId, planId, priceId, status: "active", trialEndsAt: null, providerRef: subscriptionRef, providerCustomerRef: customerRef, providerEventAt: at, flagshipSlot: null, createdAt: existing?.createdAt ?? now() });
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
