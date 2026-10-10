import {
  type AccountType,
  billingAuditQuerySchema,
  billingRuleParamsSchema,
  couponParamsSchema,
  couponQuoteRequestSchema,
  createCouponSchema,
  createPlanSchema,
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
    audit: { GET: route({ auth: "required", input: { schema: billingAuditQuerySchema, source: "query" }, handle: (ctx, input) => getService().listAudit(ctx, input.limit) }) },
    entitlements: { GET: route({ auth: "required", handle: (ctx) => getService().myEntitlements(ctx) }) },
    quote: { POST: route({ auth: "required", input: { schema: couponQuoteRequestSchema }, handle: (ctx, input) => getService().quoteCoupon(ctx, input) }) },
  };
}
