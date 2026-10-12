import type {
  AccountType,
  BillingAuditEntry,
  BillingRule,
  Coupon,
  CouponQuote,
  CreateCouponInput,
  CreatePlanInput,
  Entitlement,
  FlagshipChangeInput,
  FlagshipResult,
  FlagshipStatus,
  GrantTrialInput,
  Perk,
  Plan,
  PlanPerk,
  PlanPerkIds,
  SetPlanPerksInput,
  UpdatePerkInput,
  CreatePerkInput,
  UpdateBillingRuleInput,
  UpdateCouponInput,
  UpdatePlanInput,
} from "@signalone/validation";

import type { BillingAuditRow, BillingRepo, CouponRow, PerkRow, PlanRow, RuleRow } from "../../db/billing";
import { WebhookSignatureError, type PaymentProvider, type ProviderEvent } from "../payments/port";
import { FLAGSHIP_LIMIT } from "@signalone/validation";
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
  /** Church checks for S14 (who may buy for a church, which churches exist). Absent: church routes answer "not found". */
  organizations?: { isApprovedManager(orgId: string, userId: string): Promise<boolean>; isApproved(orgId: string): Promise<boolean> };
};

const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

const toRule = (r: RuleRow): BillingRule => ({ accountType: r.accountType as AccountType, paymentRequired: r.paymentRequired, trialDays: r.trialDays, defaultPlanId: r.defaultPlanId });
const toPlan = (p: PlanRow, perks: PlanPerk[] = []): Plan => ({
  id: p.id,
  accountType: p.accountType as AccountType,
  name: p.name,
  active: p.active,
  price: p.price && { id: p.price.id, interval: p.price.interval as "month" | "year", amountMinor: p.price.amountMinor, currency: p.price.currency as "usd", createdAt: p.price.createdAt.toISOString() },
  perks,
  createdAt: p.createdAt.toISOString(),
});
const toPerk = (p: PerkRow): Perk => ({ id: p.id, key: p.key, label: p.label, description: p.description, accountType: p.accountType as AccountType, active: p.active, createdAt: p.createdAt.toISOString() });
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

export function createBillingService({ repo, admins, provider, now = () => new Date(), paymentsEnabled = () => false, requireAccepted = async () => undefined, organizations }: BillingServiceDeps) {
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
  async function entitlementCore(accountType: AccountType, accountId: string): Promise<Omit<Entitlement, "perks">> {
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

  /** The derived answer plus the perks the account has right now (S20); a client never supplies either. */
  async function entitlementFor(accountType: AccountType, accountId: string): Promise<Entitlement> {
    const core = await entitlementCore(accountType, accountId);
    return { ...core, perks: await perkKeysFor(core, accountType, accountId) };
  }

  /** Not entitled: none. Free for everyone, or a plan-less place (flagship): every active perk of the type. A trial: the default plan's. Paying: the plan's. */
  async function perkKeysFor(core: Omit<Entitlement, "perks">, accountType: AccountType, accountId: string): Promise<string[]> {
    if (!core.entitled) return [];
    const everyPerk = async () => (await repo.listActivePerksOfType(accountType)).map((p) => p.key);
    if (core.reason === "not_required") return everyPerk();
    let planId = (await repo.getSubscription(accountType, accountId))?.planId ?? null;
    if (core.reason === "trialing") planId = (await repo.getRule(accountType)).defaultPlanId;
    if (!planId) return everyPerk();
    return (await repo.listActivePlanPerks()).filter((p) => p.planId === planId).map((p) => p.key);
  }

  /** Plans with the active perks each includes. */
  async function plansWithPerks(rows: PlanRow[]): Promise<Plan[]> {
    const all = await repo.listActivePlanPerks();
    return rows.map((row) => toPlan(row, all.filter((p) => p.planId === row.id).map(({ key, label, description }) => ({ key, label, description }))));
  }

  /** Which account a payment action is for: the signed-in member, or a church the person manages (or an admin). A stranger is told "not found". */
  async function accountFor(ctx: ServiceContext, organizationId?: string): Promise<{ type: AccountType; id: string }> {
    if (organizationId === undefined) return { type: "member", id: ctx.actor.userId };
    if (!organizations) throw notFound();
    const allowed = admins.isAdmin(ctx.actor.userId) || (await organizations.isApprovedManager(organizationId, ctx.actor.userId));
    if (!allowed) throw notFound();
    return { type: "organization", id: organizationId };
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
      return { items: await plansWithPerks(await repo.listPlans()) };
    },

    async createPlan(ctx: ServiceContext, input: CreatePlanInput): Promise<Plan> {
      requireAdmin(ctx);
      return (await plansWithPerks([await repo.createPlan({ accountType: input.accountType, name: input.name, price: { interval: input.interval, amountMinor: input.amountMinor, currency: input.currency } }, ctx.actor.userId)]))[0];
    },

    /** A price change adds a NEW price version; subscribers keep the price they bought. */
    async updatePlan(ctx: ServiceContext, id: string, input: UpdatePlanInput): Promise<Plan> {
      requireAdmin(ctx);
      const before = await repo.getPlan(id);
      if (!before) throw notFound();
      return (await plansWithPerks([await repo.updatePlan(id, input, ctx.actor.userId, before)]))[0];
    },

    // ---- Admin: perks (S20) ----------------------------------------------------------------------
    async listPerks(ctx: ServiceContext): Promise<{ items: Perk[] }> {
      requireAdmin(ctx);
      return { items: (await repo.listPerks()).map(toPerk) };
    },

    async createPerk(ctx: ServiceContext, input: CreatePerkInput): Promise<Perk> {
      requireAdmin(ctx);
      if ((await repo.listPerks()).some((p) => p.key === input.key)) throw conflict("A perk with that key already exists");
      return toPerk(await repo.createPerk({ key: input.key, label: input.label, description: input.description, accountType: input.accountType }, ctx.actor.userId));
    },

    /** The key and the account type never change; only the words and the on/off switch. */
    async updatePerk(ctx: ServiceContext, id: string, input: UpdatePerkInput): Promise<Perk> {
      requireAdmin(ctx);
      const before = await repo.getPerk(id);
      if (!before) throw notFound();
      return toPerk(await repo.updatePerk(id, input, ctx.actor.userId, before));
    },

    async listPlanPerks(ctx: ServiceContext): Promise<{ items: PlanPerkIds[] }> {
      requireAdmin(ctx);
      return { items: await repo.listPlanPerkIds() };
    },

    /** Replaces the perks a plan includes. Every perk must exist and be for the plan's account type, or nothing changes. */
    async setPlanPerks(ctx: ServiceContext, planId: string, input: SetPlanPerksInput): Promise<PlanPerkIds> {
      requireAdmin(ctx);
      const plan = await repo.getPlan(planId);
      if (!plan) throw notFound();
      const perkIds = [...new Set(input.perkIds)];
      const known = new Map((await repo.listPerks()).map((p) => [p.id, p]));
      if (perkIds.some((id) => known.get(id)?.accountType !== plan.accountType)) throw validationFailed("Choose perks for this plan's account type", { perkIds: ["Choose perks for this plan's account type"] });
      await repo.setPlanPerks(planId, perkIds, ctx.actor.userId);
      return { planId, perkIds };
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

    /**
     * An admin gives one member a fresh free trial ending `days` from now, replacing any earlier trial end. Refused
     * while the member has paid (active or late-paying); an unknown member is "not found". The reason is recorded
     * in the audit log in the same step as the change.
     */
    async grantTrial(ctx: ServiceContext, input: GrantTrialInput): Promise<Entitlement> {
      requireAdmin(ctx);
      if (!(await repo.memberExists(input.userId))) throw notFound("That member was not found");
      const trialEndsAt = new Date(now().getTime() + input.days * DAY_MS);
      const granted = await repo.grantTrial({ userId: input.userId, trialEndsAt, actorId: ctx.actor.userId, detail: { days: input.days, reason: input.reason, trialEndsAt: trialEndsAt.toISOString() } });
      if (!granted) throw conflict("This member already has a paid plan, so a trial cannot be given");
      return entitlementFor("member", input.userId);
    },

    async listAudit(ctx: ServiceContext, limit: number): Promise<{ items: BillingAuditEntry[] }> {
      requireAdmin(ctx);
      return { items: (await repo.listAudit(limit)).map(toAudit) };
    },

    // ---- Public ------------------------------------------------------------------------------------
    /** The plans anyone may see on the Services page: active plans that have a price. Inactive plans never appear. */
    async listPublicPlans(): Promise<{ items: Plan[] }> {
      return { items: await plansWithPerks((await repo.listPlans()).filter((p) => p.active && p.price !== null)) };
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
    async createCheckout(ctx: ServiceContext, input: { planId: string; origin: string; organizationId?: string }): Promise<{ url: string }> {
      if (!paymentsEnabled()) throw notFound();
      const account = await accountFor(ctx, input.organizationId);
      await requireAccepted(ctx.actor.userId);
      const plan = await repo.getPlan(input.planId);
      if (!plan || !plan.active || plan.accountType !== account.type || !plan.price) throw notFound("That plan is not available");
      const existing = await repo.getSubscription(account.type, account.id);
      if (existing?.status === "active") throw conflict(account.type === "organization" ? "This church or ministry already has an active plan. Manage it from its membership page." : "You already have an active plan. Manage it from your account.");
      const origin = new URL(input.origin).origin;
      const back = account.type === "organization" ? `${origin}/manage/${account.id}/membership` : `${origin}/services`;
      return provider.createCheckout({
        accountType: account.type,
        accountId: account.id,
        planId: plan.id,
        priceId: plan.price.id,
        planName: plan.name,
        amountMinor: plan.price.amountMinor,
        currency: plan.price.currency,
        interval: plan.price.interval as "month" | "year",
        successUrl: `${back}?checkout=success`,
        cancelUrl: `${back}?checkout=cancelled`,
      });
    },

    /** Opens the provider's customer page (change card, cancel) for an account that has a subscription; anyone else is "not found". */
    async createPortal(ctx: ServiceContext, input: { origin: string; organizationId?: string }): Promise<{ url: string }> {
      if (!paymentsEnabled()) throw notFound();
      const account = await accountFor(ctx, input.organizationId);
      const sub = await repo.getSubscription(account.type, account.id);
      if (!sub?.providerCustomerRef) throw notFound();
      const origin = new URL(input.origin).origin;
      return provider.createPortal({ customerRef: sub.providerCustomerRef, returnUrl: account.type === "organization" ? `${origin}/manage/${account.id}/membership` : `${origin}/services` });
    },

    // ---- Churches and ministries (S14) --------------------------------------------------------------------
    /** The derived answer for one church, for its approved managers and admins. */
    async organizationEntitlement(ctx: ServiceContext, organizationId: string): Promise<Entitlement> {
      const account = await accountFor(ctx, organizationId);
      return entitlementFor(account.type, account.id);
    },

    /** How many of the 50 free-for-life places are used (admin). */
    async flagshipStatus(ctx: ServiceContext): Promise<FlagshipStatus> {
      requireAdmin(ctx);
      return { used: await repo.flagshipUsed(), limit: FLAGSHIP_LIMIT };
    },

    /**
     * An admin gives a church one of the 50 free-for-life places, or takes it back. A church that is not approved is "not found";
     * a paying church, or a full list, is refused (409). The change and its audit entry are written in one step.
     */
    async setFlagship(ctx: ServiceContext, input: FlagshipChangeInput): Promise<FlagshipResult> {
      requireAdmin(ctx);
      if (!organizations || !(await organizations.isApproved(input.organizationId))) throw notFound("That church or ministry was not found");
      const detail = { reason: input.reason };
      if (input.enabled) {
        if (!(await repo.enableFlagship({ organizationId: input.organizationId, actorId: ctx.actor.userId, detail }))) {
          const sub = await repo.getSubscription("organization", input.organizationId);
          throw conflict(sub?.providerRef ? "This church or ministry has a paying plan, so it cannot be made free for life" : `All ${FLAGSHIP_LIMIT} free-for-life places are in use`);
        }
      } else {
        await repo.disableFlagship({ organizationId: input.organizationId, actorId: ctx.actor.userId, detail });
      }
      return { organizationId: input.organizationId, enabled: input.enabled, used: await repo.flagshipUsed(), limit: FLAGSHIP_LIMIT };
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

    /** The perk keys an account has right now. */
    async perksFor(accountType: AccountType, accountId: string): Promise<string[]> {
      return (await entitlementFor(accountType, accountId)).perks;
    },

    /** For a paid feature (S20): allows an account that has the perk, otherwise "not found". `organizationId` asks for a church the person manages. */
    async requirePerk(ctx: ServiceContext, key: string, organizationId?: string): Promise<void> {
      const account = await accountFor(ctx, organizationId);
      if (!(await entitlementFor(account.type, account.id)).perks.includes(key)) throw notFound();
    },

    /** Used by tests and by organization checks (S13); exposed so other services ask one place. */
    entitlementFor,
  };
}

export type BillingService = ReturnType<typeof createBillingService>;
