import {
  type AccountType,
  billingAuditQuerySchema,
  checkoutRequestSchema,
  billingRuleParamsSchema,
  couponParamsSchema,
  couponQuoteRequestSchema,
  createCouponSchema,
  createPerkSchema,
  createPlanSchema,
  flagshipChangeSchema,
  perkParamsSchema,
  setPlanPerksSchema,
  updatePerkSchema,
  grantTrialSchema,
  organizationParamsSchema,
  planParamsSchema,
  updateBillingRuleSchema,
  updateCouponSchema,
  updatePlanSchema,
} from "@signalone/validation";

import type { BillingService } from "../services/billing";
import type { createApiRoute } from "./handler";

// Route definitions for billing (S10), kept separate from the Next.js route files so acceptance tests run
// the exact same definitions with a faked identity. Every admin route answers "not found" to everyone who
// is not an admin; the two "me" routes only ever READ derived state. Nothing here takes a payment, and
// nothing lets a client say whether it is entitled.
export function billingRoutes(route: ReturnType<typeof createApiRoute>, getService: () => BillingService) {
  return {
    rules: { GET: route({ auth: "required", handle: (ctx) => getService().listRules(ctx) }) },
    rule: {
      PUT: route({
        auth: "required",
        params: { schema: billingRuleParamsSchema },
        input: { schema: updateBillingRuleSchema },
        handle: (ctx, input, _request, params) => getService().updateRule(ctx, params.accountType as AccountType, input),
      }),
    },
    plans: {
      GET: route({ auth: "required", handle: (ctx) => getService().listPlans(ctx) }),
      POST: route({ auth: "required", input: { schema: createPlanSchema }, handle: (ctx, input) => getService().createPlan(ctx, input) }),
    },
    plan: {
      PATCH: route({
        auth: "required",
        params: { schema: planParamsSchema },
        input: { schema: updatePlanSchema },
        handle: (ctx, input, _request, params) => getService().updatePlan(ctx, params.id, input),
      }),
    },
    coupons: {
      GET: route({ auth: "required", handle: (ctx) => getService().listCoupons(ctx) }),
      POST: route({ auth: "required", input: { schema: createCouponSchema }, handle: (ctx, input) => getService().createCoupon(ctx, input) }),
    },
    coupon: {
      PATCH: route({
        auth: "required",
        params: { schema: couponParamsSchema },
        input: { schema: updateCouponSchema },
        handle: (ctx, input, _request, params) => getService().updateCoupon(ctx, params.id, input),
      }),
    },
    perks: {
      GET: route({ auth: "required", handle: (ctx) => getService().listPerks(ctx) }),
      POST: route({ auth: "required", input: { schema: createPerkSchema }, handle: (ctx, input) => getService().createPerk(ctx, input) }),
    },
    perk: {
      PATCH: route({ auth: "required", params: { schema: perkParamsSchema }, input: { schema: updatePerkSchema }, handle: (ctx, input, _request, params) => getService().updatePerk(ctx, params.id, input) }),
    },
    planPerks: { GET: route({ auth: "required", handle: (ctx) => getService().listPlanPerks(ctx) }) },
    planPerksSet: {
      PUT: route({ auth: "required", params: { schema: planParamsSchema }, input: { schema: setPlanPerksSchema }, handle: (ctx, input, _request, params) => getService().setPlanPerks(ctx, params.id, input) }),
    },
    trials: { PUT: route({ auth: "required", input: { schema: grantTrialSchema }, handle: (ctx, input) => getService().grantTrial(ctx, input) }) },
    flagship: {
      GET: route({ auth: "required", handle: (ctx) => getService().flagshipStatus(ctx) }),
      PUT: route({ auth: "required", input: { schema: flagshipChangeSchema }, handle: (ctx, input) => getService().setFlagship(ctx, input) }),
    },
    organizationEntitlement: { GET: route({ auth: "required", params: { schema: organizationParamsSchema }, handle: (ctx, _input, _request, params) => getService().organizationEntitlement(ctx, params.id) }) },
    organizationCheckout: {
      POST: route({
        auth: "required",
        params: { schema: organizationParamsSchema },
        input: { schema: checkoutRequestSchema },
        handle: (ctx, input, request, params) => getService().createCheckout(ctx, { planId: input.planId, origin: new URL(request.url).origin, organizationId: params.id }),
      }),
    },
    organizationPortal: { POST: route({ auth: "required", params: { schema: organizationParamsSchema }, handle: (ctx, _input, request, params) => getService().createPortal(ctx, { origin: new URL(request.url).origin, organizationId: params.id }) }) },
    audit: { GET: route({ auth: "required", input: { schema: billingAuditQuerySchema, source: "query" }, handle: (ctx, input) => getService().listAudit(ctx, input.limit) }) },
    publicPlans: { GET: route({ auth: "public", handle: () => getService().listPublicPlans() }) },
    entitlements: { GET: route({ auth: "required", handle: (ctx) => getService().myEntitlements(ctx) }) },
    checkout: {
      POST: route({
        auth: "required",
        input: { schema: checkoutRequestSchema },
        handle: (ctx, input, request) => getService().createCheckout(ctx, { planId: input.planId, origin: new URL(request.url).origin }),
      }),
    },
    portal: { POST: route({ auth: "required", handle: (ctx, _input, request) => getService().createPortal(ctx, { origin: new URL(request.url).origin }) }) },
    // The provider notification: public (it carries no sign-in) but only accepted with a valid signature on the RAW body.
    webhook: {
      POST: route({
        auth: "public",
        handle: async (_ctx, _input, request) => getService().handleWebhook(await request.text(), request.headers.get("stripe-signature")),
      }),
    },
    quote: { POST: route({ auth: "required", input: { schema: couponQuoteRequestSchema }, handle: (ctx, input) => getService().quoteCoupon(ctx, input) }) },
  };
}
