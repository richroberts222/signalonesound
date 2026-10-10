import type {
  AccountType,
  BillingAuditEntry,
  BillingRule,
  Coupon,
  CouponQuote,
  CreateCouponInput,
  CreatePlanInput,
  Entitlement,
  Plan,
  UpdateBillingRuleInput,
  UpdateCouponInput,
  UpdatePlanInput,
} from "@signalone/validation";

import type { BillingAuditRow, BillingRepo, CouponRow, PlanRow, RuleRow } from "../../db/billing";
import { WebhookSignatureError, type PaymentProvider, type ProviderEvent } from "../payments/port";
import type { ServiceContext } from "./context";
import { conflict, notFound, validationFailed } from "./errors";
import type { AdminDirectory } from "./organizations";

// Service for plans, payment switches and entitlement (S10, docs/features/s10-payments-plans-and-switches.md).
// Rules:
//   * only admins read or change billing settings (everyone else is told "not found"), checked on every
//     call, and every change is written to the audit log together with the change;
//   * "payment required" is OFF by default; while it is off for an account type everyone of that type is
//     entitled and the payment provider is never asked (the bypass is decided here, on the server);
//   * entitlement is derived on the server from the rule and the subscription state; a client never
//     supplies it;
//   * money is whole cents with a currency. A coupon discount is rounded half up to the cent and the
//     final amount never goes below zero.
// Framework-free; the repo, the payment provider and the clock are injected.

export type BillingServiceDeps = {
  repo: BillingRepo;
  admins: AdminDirectory;
  provider: PaymentProvider;
  now?: () => Date;
  /** Whether checkout is open (PAYMENTS_PROVIDER is on). Closed by default: every payment route answers "not found". */
  paymentsEnabled?: () => boolean;
  /** Throws unless the member has accepted the current terms (S1). */
  requireAccepted?: (userId: string) => Promise<void>;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

const toRule = (r: RuleRow): BillingRule => ({ accountType: r.accountType as AccountType, paymentRequired: r.paymentRequired, trialDays: r.trialDays, defaultPlanId: r.defaultPlanId });
const toPlan = (p: PlanRow): Plan => ({
  id: p.id,
  accountType: p.accountType as AccountType,
  name: p.name,
  active: p.active,
  price: p.price && { id: p.price.id, interval: p.price.interval as "month" | "year", amountMinor: p.price.amountMinor, currency: p.price.currency as "usd", createdAt: p.price.createdAt.toISOString() },
  createdAt: p.createdAt.toISOString(),
});
const toCoupon = (c: CouponRow): Coupon => ({
  id: c.id,
  code: c.code,
  percentOff: c.percentOff,
  amountOffMinor: c.amountOffMinor,
  currency: c.currency as "usd" | null,
  expiresAt: iso(c.expiresAt),
  maxRedemptions: c.maxRedemptions,
  redemptions: c.redemptions,
  active: c.active,
  createdAt: c.createdAt.toISOString(),
});
const toAudit = (a: BillingAuditRow): BillingAuditEntry => ({ id: a.id, actorId: a.actorId, action: a.action, subject: a.subject, detail: a.detail, at: a.at.toISOString() });

/** The discount for a price, in whole cents, rounded half up; the result is never above the price. */
export function discountMinor(amountMinor: number, coupon: { percentOff: number | null; amountOffMinor: number | null }): number {
  const raw = coupon.percentOff !== null ? Math.floor((amountMinor * coupon.percentOff + 50) / 100) : (coupon.amountOffMinor ?? 0);
  return Math.min(Math.max(raw, 0), amountMinor);
}

export function createBillingService({ repo, admins, provider, now = () => new Date(), paymentsEnabled = () => false, requireAccepted = async () => undefined }: BillingServiceDeps) {
  const requireAdmin = (ctx: ServiceContext): void => {
    if (!admins.isAdmin(ctx.actor.userId)) throw notFound(); // admin tools do not reveal themselves
  };

  /** Checks a coupon for an account against a plan's price and returns the price it gives. Records nothing. */
  async function priceWithCoupon(plan: PlanRow, code: string, accountType: AccountType, accountId: string): Promise<{ coupon: CouponRow; quote: CouponQuote }> {
    if (!plan.price) throw notFound("That plan is not available");
    const coupon = await repo.getCouponByCode(code);
    if (!coupon) throw notFound("That coupon code was not found");
    const at = now();
    const refuse = (message: string) => validationFailed(message, { code: [message] });
    if (!coupon.active) throw refuse("This coupon is no longer active");
    if (coupon.expiresAt && coupon.expiresAt.getTime() <= at.getTime()) throw refuse("This coupon has expired");
    if (await repo.hasUsedCoupon(coupon.id, accountType, accountId)) throw refuse("You have already used this coupon");
    if (coupon.maxRedemptions !== null && coupon.redemptions >= coupon.maxRedemptions) throw refuse("This coupon has reached its limit");
    if (coupon.amountOffMinor !== null && coupon.currency !== plan.price.currency) throw refuse("This coupon does not apply to this plan");
    const discount = discountMinor(plan.price.amountMinor, coupon);
    return { coupon, quote: { code: coupon.code, originalAmountMinor: plan.price.amountMinor, discountMinor: discount, finalAmountMinor: plan.price.amountMinor - discount, currency: plan.price.currency as "usd" } };
  }

  /** The derived answer: may this account use paid features? Starts the one-time trial when the rule has one. */
  async function entitlementFor(accountType: AccountType, accountId: string): Promise<Entitlement> {
    const rule = await repo.getRule(accountType);
    const sub = await repo.getSubscription(accountType, accountId);
    if (!rule.paymentRequired) {
      return { accountType, entitled: true, reason: "not_required", status: (sub?.status as Entitlement["status"]) ?? "none", trialEndsAt: iso(sub?.trialEndsAt ?? null) }; // the provider is never asked
    }
    let current = sub;
    if (!current && rule.trialDays > 0) {
      current = await repo.startTrial({ accountType, accountId, trialEndsAt: new Date(now().getTime() + rule.trialDays * DAY_MS) });
    }
    if (!current) return { accountType, entitled: false, reason: "payment_required", status: "none", trialEndsAt: null };
    if (current.status === "active") return { accountType, entitled: true, reason: "active", status: "active", trialEndsAt: null };
    if (current.status === "trialing") {
      const ends = current.trialEndsAt;
      const live = ends !== null && now().getTime() < ends.getTime(); // the trial ends AT its end instant
      return { accountType, entitled: live, reason: live ? "trialing" : "trial_ended", status: "trialing", trialEndsAt: iso(ends) };
    }
    return { accountType, entitled: false, reason: "payment_required", status: current.status as Entitlement["status"], trialEndsAt: null };
  }

  return {
    // ---- Admin: rules ----------------------------------------------------------------------------
    async listRules(ctx: ServiceContext): Promise<{ items: BillingRule[] }> {
      requireAdmin(ctx);
      return { items: (await repo.getRules()).map(toRule) };
    },

    async updateRule(ctx: ServiceContext, accountType: AccountType, input: UpdateBillingRuleInput): Promise<BillingRule> {
      requireAdmin(ctx);
      if (input.defaultPlanId !== null) {
        const plan = await repo.getPlan(input.defaultPlanId);
        if (!plan || plan.accountType !== accountType) throw validationFailed("Choose a plan for this account type", { defaultPlanId: ["Choose a plan for this account type"] });
      }
      const before = await repo.getRule(accountType);
      return toRule(await repo.updateRule(accountType, { paymentRequired: input.paymentRequired, trialDays: input.trialDays, defaultPlanId: input.defaultPlanId }, ctx.actor.userId, before));
    },

    // ---- Admin: plans ----------------------------------------------------------------------------
    async listPlans(ctx: ServiceContext): Promise<{ items: Plan[] }> {
      requireAdmin(ctx);
      return { items: (await repo.listPlans()).map(toPlan) };
    },

    async createPlan(ctx: ServiceContext, input: CreatePlanInput): Promise<Plan> {
      requireAdmin(ctx);
      return toPlan(await repo.createPlan({ accountType: input.accountType, name: input.name, price: { interval: input.interval, amountMinor: input.amountMinor, currency: input.currency } }, ctx.actor.userId));
    },

    /** A price change adds a NEW price version; subscribers keep the price they bought. */
    async updatePlan(ctx: ServiceContext, id: string, input: UpdatePlanInput): Promise<Plan> {
      requireAdmin(ctx);
      const before = await repo.getPlan(id);
      if (!before) throw notFound();
      return toPlan(await repo.updatePlan(id, input, ctx.actor.userId, before));
    },

    // ---- Admin: coupons --------------------------------------------------------------------------
    async listCoupons(ctx: ServiceContext): Promise<{ items: Coupon[] }> {
      requireAdmin(ctx);
      return { items: (await repo.listCoupons()).map(toCoupon) };
    },

    async createCoupon(ctx: ServiceContext, input: CreateCouponInput): Promise<Coupon> {
      requireAdmin(ctx);
      if (await repo.getCouponByCode(input.code)) throw conflict("A coupon with that code already exists");
      const row = await repo.createCoupon(
        { code: input.code, percentOff: input.percentOff ?? null, amountOffMinor: input.amountOffMinor ?? null, currency: input.amountOffMinor !== undefined ? (input.currency ?? null) : null, expiresAt: input.expiresAt ? new Date(input.expiresAt) : null, maxRedemptions: input.maxRedemptions ?? null },
        ctx.actor.userId,
      );
      return toCoupon(row);
    },

    async updateCoupon(ctx: ServiceContext, id: string, input: UpdateCouponInput): Promise<Coupon> {
      requireAdmin(ctx);
      const before = await repo.getCoupon(id);
      if (!before) throw notFound();
      const change: { active?: boolean; expiresAt?: Date | null; maxRedemptions?: number | null } = {};
      if (input.active !== undefined) change.active = input.active;
      if (input.expiresAt !== undefined) change.expiresAt = input.expiresAt === null ? null : new Date(input.expiresAt);
      if (input.maxRedemptions !== undefined) change.maxRedemptions = input.maxRedemptions;
      return toCoupon(await repo.updateCoupon(id, change, ctx.actor.userId, before));
    },

    async listAudit(ctx: ServiceContext, limit: number): Promise<{ items: BillingAuditEntry[] }> {
      requireAdmin(ctx);
      return { items: (await repo.listAudit(limit)).map(toAudit) };
    },

    // ---- Public ------------------------------------------------------------------------------------
    /** The plans anyone may see on the Services page: active plans that have a price. Inactive plans never appear. */
    async listPublicPlans(): Promise<{ items: Plan[] }> {
      return { items: (await repo.listPlans()).filter((p) => p.active && p.price !== null).map(toPlan) };
    },

    // ---- The signed-in person ----------------------------------------------------------------------
    /** The derived answer for the signed-in member. Organization answers use the same rule per organization (S13). */
    async myEntitlements(ctx: ServiceContext): Promise<{ items: Entitlement[] }> {
      return { items: [await entitlementFor("member", ctx.actor.userId)] };
    },

    /** Shows the price a coupon would give for a plan. Read-only: it records nothing. */
    async quoteCoupon(ctx: ServiceContext, input: { code: string; planId: string }): Promise<CouponQuote> {
      const plan = await repo.getPlan(input.planId);
      if (!plan || !plan.active || plan.accountType !== "member") throw notFound("That plan is not available");
      return (await priceWithCoupon(plan, input.code, "member", ctx.actor.userId)).quote;
    },

    /**
     * Subscribes the signed-in member to an ACTIVE plan through the payment provider, using a coupon if given
     * (the use is recorded in one step that re-checks the limit). Not reachable from any HTTP route in S10: the
     * real checkout (S11) is what will call it, so a fake provider can never grant access in a live setting.
     */
    async subscribe(ctx: ServiceContext, input: { planId: string; couponCode?: string }): Promise<Entitlement> {
      const accountId = ctx.actor.userId;
      const plan = await repo.getPlan(input.planId);
      if (!plan || !plan.active || plan.accountType !== "member" || !plan.price) throw notFound("That plan is not available");
      let amount = plan.price.amountMinor;
      if (input.couponCode) {
        const { coupon, quote } = await priceWithCoupon(plan, input.couponCode, "member", accountId);
        if (!(await repo.useCoupon({ couponId: coupon.id, accountType: "member", accountId, now: now() }))) throw validationFailed("This coupon can no longer be used", { code: ["This coupon can no longer be used"] });
        amount = quote.finalAmountMinor;
      }
      const result = await provider.startSubscription({ accountType: "member", accountId, priceId: plan.price.id, amountMinor: amount, currency: plan.price.currency, interval: plan.price.interval });
      await repo.saveSubscription({ accountType: "member", accountId, planId: plan.id, priceId: plan.price.id, status: result.status, providerRef: result.providerRef });
      return entitlementFor("member", accountId);
    },

    // ---- Checkout and the provider's notifications (S11) ---------------------------------------------
    /**
     * Opens the provider's hosted checkout for an ACTIVE member plan and returns only its address. The price comes
     * from our plan, never from the client. Closed (not found) unless payments are switched on. `origin` is where the
     * person is returned afterwards (our own site).
     */
    async createCheckout(ctx: ServiceContext, input: { planId: string; origin: string }): Promise<{ url: string }> {
      if (!paymentsEnabled()) throw notFound();
      await requireAccepted(ctx.actor.userId);
      const plan = await repo.getPlan(input.planId);
      if (!plan || !plan.active || plan.accountType !== "member" || !plan.price) throw notFound("That plan is not available");
      const existing = await repo.getSubscription("member", ctx.actor.userId);
      if (existing?.status === "active") throw conflict("You already have an active plan. Manage it from your account.");
      const origin = new URL(input.origin).origin;
      return provider.createCheckout({
        accountType: "member",
        accountId: ctx.actor.userId,
        planId: plan.id,
        priceId: plan.price.id,
        planName: plan.name,
        amountMinor: plan.price.amountMinor,
        currency: plan.price.currency,
        interval: plan.price.interval as "month" | "year",
        successUrl: `${origin}/services?checkout=success`,
        cancelUrl: `${origin}/services?checkout=cancelled`,
      });
    },

    /** Opens the provider's customer page (change card, cancel) for someone who has a subscription; anyone else is "not found". */
    async createPortal(ctx: ServiceContext, input: { origin: string }): Promise<{ url: string }> {
      if (!paymentsEnabled()) throw notFound();
      const sub = await repo.getSubscription("member", ctx.actor.userId);
      if (!sub?.providerCustomerRef) throw notFound();
      return provider.createPortal({ customerRef: sub.providerCustomerRef, returnUrl: `${new URL(input.origin).origin}/services` });
    },

    /**
     * Applies a payment notification. The signature is verified on the RAW body first; a replay of an event already
     * applied changes nothing; an event older than what is stored never overwrites it; an unknown event type is
     * acknowledged and ignored. The state is changed by the provider's own reference, never by anything a browser sent.
     */
    async handleWebhook(rawBody: string, signature: string | null): Promise<{ received: true }> {
      let event: ProviderEvent;
      try {
        event = provider.readWebhook(rawBody, signature);
      } catch (error) {
        if (error instanceof WebhookSignatureError) throw validationFailed("The notification could not be verified");
        throw error;
      }
      if (await repo.hasPaymentEvent(event.eventId)) return { received: true };
      switch (event.kind) {
        case "checkout_completed":
          await repo.applyCheckoutCompleted({ accountType: event.accountType, accountId: event.accountId, planId: event.planId, priceId: event.priceId, subscriptionRef: event.subscriptionRef, customerRef: event.customerRef, at: event.at });
          break;
        case "subscription_active":
          await repo.setStatusByProviderRef(event.subscriptionRef, "active", event.at);
          break;
        case "payment_failed":
          await repo.setStatusByProviderRef(event.subscriptionRef, "past_due", event.at);
          break;
        case "subscription_cancelled":
          await repo.setStatusByProviderRef(event.subscriptionRef, "cancelled", event.at);
          break;
        case "ignored":
          break;
      }
      await repo.recordPaymentEvent(event.eventId, event.kind === "ignored" ? event.type : event.kind); // after applying, so a crash in between is retried, never lost
      return { received: true };
    },

    /** Used by tests and by organization checks (S13); exposed so other services ask one place. */
    entitlementFor,
  };
}

export type BillingService = ReturnType<typeof createBillingService>;
