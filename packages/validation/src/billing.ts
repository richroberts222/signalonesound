import { z } from "zod";

// S10 PAYMENTS: PLANS, SWITCHES AND ENTITLEMENT (docs/features/s10-payments-plans-and-switches.md).
// Wire contracts for the admin billing console and for the signed-in person's entitlement. Money is
// ALWAYS whole minor units (cents) plus an explicit currency, never a decimal (docs/payments.md rule 5).

export const ACCOUNT_TYPES = ["member", "organization"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];
export const BILLING_INTERVALS = ["month", "year"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];
/** A subscription row exists only once someone has started a trial or bought a plan; no row means "none". */
export const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "cancelled"] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];
export const CURRENCIES = ["usd"] as const;

export const MAX_TRIAL_DAYS = 365;
/** Upper bound for any amount, in cents ($10,000), so a typo cannot create an absurd price. */
export const MAX_AMOUNT_MINOR = 1_000_000;
export const PLAN_NAME_MAX = 80;
export const COUPON_CODE_MAX = 32;
export const MAX_COUPON_REDEMPTIONS = 100_000;
export const BILLING_AUDIT_LIMIT_MAX = 200;

const hasControlCharacter = (value: string): boolean => [...value].some((char) => { const code = char.codePointAt(0) ?? 0; return code < 32 || code === 127 || (code >= 128 && code < 160); });

export const moneyAmountSchema = z.number().int("Amounts are whole cents, not decimals").min(0, "An amount cannot be negative").max(MAX_AMOUNT_MINOR, "That amount is too large");
export const currencySchema = z.enum(CURRENCIES);
export const accountTypeSchema = z.enum(ACCOUNT_TYPES);
const planName = z.string().trim().min(1, "A name is required").max(PLAN_NAME_MAX).refine((v) => !hasControlCharacter(v), "The name must be plain text");
const isoMoment = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Use a valid date and time").transform((v) => new Date(v).toISOString());
const couponCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9][A-Z0-9_-]{2,31}$/, `A coupon code is 3 to ${COUPON_CODE_MAX} letters, numbers, dashes or underscores`);

// ---- Billing rules (who pays) -------------------------------------------------------------------------
export const billingRuleSchema = z.object({
  accountType: accountTypeSchema,
  paymentRequired: z.boolean(),
  trialDays: z.number().int().min(0).max(MAX_TRIAL_DAYS),
  defaultPlanId: z.uuid().nullable(),
});
export type BillingRule = z.infer<typeof billingRuleSchema>;
export const billingRulesSchema = z.object({ items: z.array(billingRuleSchema) });
export const updateBillingRuleSchema = z
  .object({
    paymentRequired: z.boolean(),
    trialDays: z.number().int("Trial days are whole days").min(0).max(MAX_TRIAL_DAYS, `A trial is at most ${MAX_TRIAL_DAYS} days`),
    defaultPlanId: z.uuid().nullable(),
  })
  .strict();
export type UpdateBillingRuleInput = z.infer<typeof updateBillingRuleSchema>;
export const billingRuleParamsSchema = z.object({ accountType: accountTypeSchema });

// ---- Plans and prices ---------------------------------------------------------------------------------
export const priceSchema = z.object({ id: z.uuid(), interval: z.enum(BILLING_INTERVALS), amountMinor: moneyAmountSchema, currency: currencySchema, createdAt: z.string() });
export type Price = z.infer<typeof priceSchema>;
export const planSchema = z.object({ id: z.uuid(), accountType: accountTypeSchema, name: z.string(), active: z.boolean(), price: priceSchema.nullable(), createdAt: z.string() });
export type Plan = z.infer<typeof planSchema>;
export const planListSchema = z.object({ items: z.array(planSchema) });

const priceInput = z.object({ interval: z.enum(BILLING_INTERVALS), amountMinor: moneyAmountSchema, currency: currencySchema }).strict();
export const createPlanSchema = z.object({ accountType: accountTypeSchema, name: planName, interval: z.enum(BILLING_INTERVALS), amountMinor: moneyAmountSchema, currency: currencySchema }).strict();
export type CreatePlanInput = z.infer<typeof createPlanSchema>;
/** A price change creates a NEW price version; existing subscribers keep the price they bought. */
export const updatePlanSchema = z
  .object({ name: planName.optional(), active: z.boolean().optional(), price: priceInput.optional() })
  .strict()
  .refine((v) => v.name !== undefined || v.active !== undefined || v.price !== undefined, "Change at least one thing");
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export const planParamsSchema = z.object({ id: z.uuid() });

// ---- Coupons ------------------------------------------------------------------------------------------
export const couponSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  percentOff: z.number().int().nullable(),
  amountOffMinor: moneyAmountSchema.nullable(),
  currency: currencySchema.nullable(),
  expiresAt: z.string().nullable(),
  maxRedemptions: z.number().int().nullable(),
  redemptions: z.number().int(),
  active: z.boolean(),
  createdAt: z.string(),
});
export type Coupon = z.infer<typeof couponSchema>;
export const couponListSchema = z.object({ items: z.array(couponSchema) });
/** Exactly one kind of discount: a percentage, or a fixed amount in whole cents. */
export const createCouponSchema = z
  .object({
    code: couponCode,
    percentOff: z.number().int("A percentage is a whole number").min(1).max(100).optional(),
    amountOffMinor: moneyAmountSchema.optional(),
    currency: currencySchema.optional(),
    expiresAt: isoMoment.optional(),
    maxRedemptions: z.number().int().min(1).max(MAX_COUPON_REDEMPTIONS).optional(),
  })
  .strict()
  .refine((v) => (v.percentOff === undefined) !== (v.amountOffMinor === undefined), "Choose either a percentage or a fixed amount")
  .refine((v) => v.amountOffMinor === undefined || v.currency !== undefined, "A fixed amount needs a currency");
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export const updateCouponSchema = z
  .object({ active: z.boolean().optional(), expiresAt: isoMoment.nullable().optional(), maxRedemptions: z.number().int().min(1).max(MAX_COUPON_REDEMPTIONS).nullable().optional() })
  .strict()
  .refine((v) => v.active !== undefined || v.expiresAt !== undefined || v.maxRedemptions !== undefined, "Change at least one thing");
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export const couponParamsSchema = z.object({ id: z.uuid() });
/** The price a coupon gives for a plan, all in whole cents. Never goes below zero. */
export const couponQuoteRequestSchema = z.object({ code: couponCode, planId: z.uuid() }).strict();
export const couponQuoteSchema = z.object({ code: z.string(), originalAmountMinor: moneyAmountSchema, discountMinor: moneyAmountSchema, finalAmountMinor: moneyAmountSchema, currency: currencySchema });
export type CouponQuote = z.infer<typeof couponQuoteSchema>;

// ---- Entitlement (derived on the server; a client can never supply it) --------------------------------
export const ENTITLEMENT_REASONS = ["not_required", "trialing", "active", "trial_ended", "payment_required"] as const;
export const entitlementSchema = z.object({
  accountType: accountTypeSchema,
  entitled: z.boolean(),
  reason: z.enum(ENTITLEMENT_REASONS),
  status: z.enum([...SUBSCRIPTION_STATUSES, "none"]),
  trialEndsAt: z.string().nullable(),
});
export type Entitlement = z.infer<typeof entitlementSchema>;
export const entitlementsSchema = z.object({ items: z.array(entitlementSchema) });

// ---- Audit (every billing change; append-only) --------------------------------------------------------
export const billingAuditEntrySchema = z.object({ id: z.uuid(), actorId: z.string(), action: z.string(), subject: z.string(), detail: z.string(), at: z.string() });
export type BillingAuditEntry = z.infer<typeof billingAuditEntrySchema>;
export const billingAuditListSchema = z.object({ items: z.array(billingAuditEntrySchema) });
export const billingAuditQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(BILLING_AUDIT_LIMIT_MAX).default(50) });
