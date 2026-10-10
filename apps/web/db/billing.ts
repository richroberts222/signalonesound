import { and, asc, count, desc, eq, isNull, like, lte, or, sql } from "drizzle-orm";

import type { Database } from "./client";
import { withDbErrors } from "./errors";
import { auditLog, billingCoupon, billingCouponUse, billingPlan, billingPrice, billingRule, billingSubscription, paymentEvent } from "./schema";

// Data access for billing (S10, docs/features/s10-payments-plans-and-switches.md). Server-only by
// convention (like all of db/). Every admin change is written together with its audit entry in ONE
// batch (an atomic transaction), so a change without its audit entry cannot occur. Money is whole
// cents plus a currency. No card data exists here; `provider_ref` is the provider's own id.
export type RuleRow = { accountType: string; paymentRequired: boolean; trialDays: number; defaultPlanId: string | null };
export type PriceRow = { id: string; planId: string; interval: string; amountMinor: number; currency: string; createdAt: Date };
export type PlanRow = { id: string; accountType: string; name: string; active: boolean; createdAt: Date; price: PriceRow | null };
export type CouponRow = typeof billingCoupon.$inferSelect & { redemptions: number };
export type SubscriptionRow = typeof billingSubscription.$inferSelect;
export type BillingAuditRow = typeof auditLog.$inferSelect;
export type PriceInput = { interval: string; amountMinor: number; currency: string };

export type BillingRepo = ReturnType<typeof createBillingRepo>;

const NO_RULE = (accountType: string): RuleRow => ({ accountType, paymentRequired: false, trialDays: 0, defaultPlanId: null });
const toRule = (row: typeof billingRule.$inferSelect): RuleRow => ({ accountType: row.accountType, paymentRequired: row.paymentRequired, trialDays: row.trialDays, defaultPlanId: row.defaultPlanId });

export function createBillingRepo(db: Database) {
  async function latestPrices(planIds: string[]): Promise<Map<string, PriceRow>> {
    if (planIds.length === 0) return new Map();
    const rows = await db.select().from(billingPrice).orderBy(desc(billingPrice.createdAt), desc(billingPrice.id));
    const out = new Map<string, PriceRow>();
    for (const row of rows) if (planIds.includes(row.planId) && !out.has(row.planId)) out.set(row.planId, row);
    return out;
  }
  const withPrice = async (rows: (typeof billingPlan.$inferSelect)[]): Promise<PlanRow[]> => {
    const prices = await latestPrices(rows.map((r) => r.id));
    return rows.map((r) => ({ ...r, price: prices.get(r.id) ?? null }));
  };
  const audit = (actorId: string, action: string, subject: string, detail: unknown) => db.insert(auditLog).values({ actorId, action, subject, detail: JSON.stringify(detail) });

  const getCoupon = async (where: ReturnType<typeof eq>): Promise<CouponRow | null> => {
    const [row] = await db.select().from(billingCoupon).where(where).limit(1);
    if (!row) return null;
    const [uses] = await db.select({ n: count() }).from(billingCouponUse).where(eq(billingCouponUse.couponId, row.id));
    return { ...row, redemptions: Number(uses?.n ?? 0) };
  };

  return {
    getRules: (): Promise<RuleRow[]> =>
      withDbErrors("billing.getRules", async () => {
        const rows = await db.select().from(billingRule);
        return (["member", "organization"] as const).map((type) => { const row = rows.find((r) => r.accountType === type); return row ? toRule(row) : NO_RULE(type); });
      }),

    getRule: (accountType: string): Promise<RuleRow> =>
      withDbErrors("billing.getRule", async () => {
        const [row] = await db.select().from(billingRule).where(eq(billingRule.accountType, accountType)).limit(1);
        return row ? toRule(row) : NO_RULE(accountType);
      }),

    /** Saves the rule and its audit entry together. */
    updateRule: (accountType: string, next: Omit<RuleRow, "accountType">, actorId: string, before: RuleRow): Promise<RuleRow> =>
      withDbErrors("billing.updateRule", async () => {
        await db.batch([
          db
            .insert(billingRule)
            .values({ accountType, ...next })
            .onConflictDoUpdate({ target: billingRule.accountType, set: { ...next, updatedAt: sql`now()` } }),
          audit(actorId, "billing.rule.update", `rule:${accountType}`, { before, after: { accountType, ...next } }),
        ]);
        return { accountType, ...next };
      }),

    listPlans: (): Promise<PlanRow[]> =>
      withDbErrors("billing.listPlans", async () => withPrice(await db.select().from(billingPlan).orderBy(asc(billingPlan.accountType), asc(billingPlan.createdAt), asc(billingPlan.id)))),

    getPlan: (id: string): Promise<PlanRow | null> =>
      withDbErrors("billing.getPlan", async () => {
        const [row] = await db.select().from(billingPlan).where(eq(billingPlan.id, id)).limit(1);
        return row ? (await withPrice([row]))[0] : null;
      }),

    createPlan: (input: { accountType: string; name: string; price: PriceInput }, actorId: string): Promise<PlanRow> =>
      withDbErrors("billing.createPlan", async () => {
        const planId = crypto.randomUUID();
        await db.batch([
          db.insert(billingPlan).values({ id: planId, accountType: input.accountType, name: input.name, active: false }),
          db.insert(billingPrice).values({ planId, ...input.price }),
          audit(actorId, "billing.plan.create", `plan:${planId}`, { after: { ...input, active: false } }),
        ]);
        const [row] = await db.select().from(billingPlan).where(eq(billingPlan.id, planId)).limit(1);
        return (await withPrice([row]))[0];
      }),

    /** Applies the changes; a new price is a NEW version row, old subscribers keep theirs. */
    updatePlan: (id: string, change: { name?: string; active?: boolean; price?: PriceInput }, actorId: string, before: PlanRow): Promise<PlanRow> =>
      withDbErrors("billing.updatePlan", async () => {
        const set: { name?: string; active?: boolean } = {};
        if (change.name !== undefined) set.name = change.name;
        if (change.active !== undefined) set.active = change.active;
        const writes = [];
        if (Object.keys(set).length > 0) writes.push(db.update(billingPlan).set(set).where(eq(billingPlan.id, id)));
        if (change.price) writes.push(db.insert(billingPrice).values({ planId: id, ...change.price }));
        await db.batch([...writes, audit(actorId, "billing.plan.update", `plan:${id}`, { before: { name: before.name, active: before.active, price: before.price && { interval: before.price.interval, amountMinor: before.price.amountMinor, currency: before.price.currency } }, after: change })] as unknown as Parameters<typeof db.batch>[0]);
        const [row] = await db.select().from(billingPlan).where(eq(billingPlan.id, id)).limit(1);
        return (await withPrice([row]))[0];
      }),

    listCoupons: (): Promise<CouponRow[]> =>
      withDbErrors("billing.listCoupons", async () => {
        const rows = await db.select().from(billingCoupon).orderBy(desc(billingCoupon.createdAt), asc(billingCoupon.code));
        const uses = await db.select({ couponId: billingCouponUse.couponId, n: count() }).from(billingCouponUse).groupBy(billingCouponUse.couponId);
        const counts = new Map(uses.map((u) => [u.couponId, Number(u.n)]));
        return rows.map((r) => ({ ...r, redemptions: counts.get(r.id) ?? 0 }));
      }),

    getCoupon: (id: string): Promise<CouponRow | null> => withDbErrors("billing.getCoupon", () => getCoupon(eq(billingCoupon.id, id))),
    getCouponByCode: (code: string): Promise<CouponRow | null> => withDbErrors("billing.getCouponByCode", () => getCoupon(eq(billingCoupon.code, code))),

    /** A duplicate code is reported as a conflict by the shared database error mapping. */
    createCoupon: (input: { code: string; percentOff: number | null; amountOffMinor: number | null; currency: string | null; expiresAt: Date | null; maxRedemptions: number | null }, actorId: string): Promise<CouponRow> =>
      withDbErrors("billing.createCoupon", async () => {
        const id = crypto.randomUUID();
        await db.batch([db.insert(billingCoupon).values({ id, ...input, active: true }), audit(actorId, "billing.coupon.create", `coupon:${input.code}`, { after: { ...input, expiresAt: input.expiresAt?.toISOString() ?? null } })]);
        return (await getCoupon(eq(billingCoupon.id, id))) as CouponRow;
      }),

    updateCoupon: (id: string, change: { active?: boolean; expiresAt?: Date | null; maxRedemptions?: number | null }, actorId: string, before: CouponRow): Promise<CouponRow> =>
      withDbErrors("billing.updateCoupon", async () => {
        await db.batch([
          db.update(billingCoupon).set(change).where(eq(billingCoupon.id, id)),
          audit(actorId, "billing.coupon.update", `coupon:${before.code}`, { before: { active: before.active, expiresAt: before.expiresAt?.toISOString() ?? null, maxRedemptions: before.maxRedemptions }, after: { ...change, expiresAt: change.expiresAt === undefined ? undefined : (change.expiresAt?.toISOString() ?? null) } }),
        ]);
        return (await getCoupon(eq(billingCoupon.id, id))) as CouponRow;
      }),

    /**
     * Records one use of a coupon in ONE statement that re-checks active, expiry, the limit and "already
     * used", so two simultaneous requests cannot exceed the limit. True when the use was recorded.
     */
    useCoupon: (input: { couponId: string; accountType: string; accountId: string; now: Date }): Promise<boolean> =>
      withDbErrors("billing.useCoupon", async () => {
        const result = await db.execute(sql`
          insert into billing_coupon_use (coupon_id, account_type, account_id)
          select c.id, ${input.accountType}, ${input.accountId} from billing_coupon c
          where c.id = ${input.couponId}::uuid and c.active
            and (c.expires_at is null or c.expires_at > ${input.now.toISOString()}::timestamptz)
            and (c.max_redemptions is null or (select count(*) from billing_coupon_use u where u.coupon_id = c.id) < c.max_redemptions)
          on conflict (coupon_id, account_type, account_id) do nothing
          returning id`);
        return result.rows.length > 0;
      }),

    hasUsedCoupon: (couponId: string, accountType: string, accountId: string): Promise<boolean> =>
      withDbErrors("billing.hasUsedCoupon", async () => {
        const [row] = await db.select({ id: billingCouponUse.id }).from(billingCouponUse).where(and(eq(billingCouponUse.couponId, couponId), eq(billingCouponUse.accountType, accountType), eq(billingCouponUse.accountId, accountId))).limit(1);
        return row !== undefined;
      }),

    getSubscription: (accountType: string, accountId: string): Promise<SubscriptionRow | null> =>
      withDbErrors("billing.getSubscription", async () => {
        const [row] = await db.select().from(billingSubscription).where(and(eq(billingSubscription.accountType, accountType), eq(billingSubscription.accountId, accountId))).limit(1);
        return row ?? null;
      }),

    /** Starts a trial once: a second call returns the row that already exists and changes nothing. */
    startTrial: (input: { accountType: string; accountId: string; trialEndsAt: Date }): Promise<SubscriptionRow> =>
      withDbErrors("billing.startTrial", async () => {
        await db.insert(billingSubscription).values({ ...input, status: "trialing" }).onConflictDoNothing();
        const [row] = await db.select().from(billingSubscription).where(and(eq(billingSubscription.accountType, input.accountType), eq(billingSubscription.accountId, input.accountId))).limit(1);
        return row;
      }),

    saveSubscription: (input: { accountType: string; accountId: string; planId: string; priceId: string; status: string; providerRef: string | null }): Promise<SubscriptionRow> =>
      withDbErrors("billing.saveSubscription", async () => {
        const [row] = await db
          .insert(billingSubscription)
          .values({ ...input, trialEndsAt: null })
          .onConflictDoUpdate({ target: [billingSubscription.accountType, billingSubscription.accountId], set: { planId: input.planId, priceId: input.priceId, status: input.status, providerRef: input.providerRef, trialEndsAt: null } })
          .returning();
        return row;
      }),

    // ---- Payment notifications (S11) ---------------------------------------------------------------
    hasPaymentEvent: (eventId: string): Promise<boolean> =>
      withDbErrors("billing.hasPaymentEvent", async () => {
        const [row] = await db.select({ id: paymentEvent.eventId }).from(paymentEvent).where(eq(paymentEvent.eventId, eventId)).limit(1);
        return row !== undefined;
      }),

    recordPaymentEvent: (eventId: string, type: string): Promise<void> =>
      withDbErrors("billing.recordPaymentEvent", async () => {
        await db.insert(paymentEvent).values({ eventId, type }).onConflictDoNothing();
      }),

    /** Makes the account's subscription active with the provider's references, unless a newer notification already set it. */
    applyCheckoutCompleted: (input: { accountType: string; accountId: string; planId: string; priceId: string; subscriptionRef: string; customerRef: string | null; at: Date }): Promise<void> =>
      withDbErrors("billing.applyCheckoutCompleted", async () => {
        const values = { accountType: input.accountType, accountId: input.accountId, planId: input.planId, priceId: input.priceId, status: "active", trialEndsAt: null, providerRef: input.subscriptionRef, providerCustomerRef: input.customerRef, providerEventAt: input.at };
        await db
          .insert(billingSubscription)
          .values(values)
          .onConflictDoUpdate({
            target: [billingSubscription.accountType, billingSubscription.accountId],
            set: { planId: input.planId, priceId: input.priceId, status: "active", trialEndsAt: null, providerRef: input.subscriptionRef, providerCustomerRef: input.customerRef, providerEventAt: input.at },
            setWhere: or(isNull(billingSubscription.providerEventAt), lte(billingSubscription.providerEventAt, input.at)),
          });
      }),

    /** Changes the status of the subscription the provider names, unless a newer notification already did. True when that subscription is known. */
    setStatusByProviderRef: (subscriptionRef: string, status: string, at: Date): Promise<boolean> =>
      withDbErrors("billing.setStatusByProviderRef", async () => {
        const [known] = await db.select({ id: billingSubscription.id }).from(billingSubscription).where(eq(billingSubscription.providerRef, subscriptionRef)).limit(1);
        if (!known) return false;
        await db
          .update(billingSubscription)
          .set({ status, providerEventAt: at })
          .where(and(eq(billingSubscription.providerRef, subscriptionRef), or(isNull(billingSubscription.providerEventAt), lte(billingSubscription.providerEventAt, at))));
        return true;
      }),

    listAudit: (limit: number): Promise<BillingAuditRow[]> =>
      withDbErrors("billing.listAudit", () => db.select().from(auditLog).where(like(auditLog.action, "billing.%")).orderBy(desc(auditLog.at), desc(auditLog.id)).limit(limit)),
  };
}
