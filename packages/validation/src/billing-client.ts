import type { ApiClient } from "./api-client";
import {
  billingAuditListSchema,
  billingRuleSchema,
  billingRulesSchema,
  checkoutResultSchema,
  couponListSchema,
  couponQuoteSchema,
  couponSchema,
  entitlementsSchema,
  planListSchema,
  planSchema,
  type AccountType,
  type CreateCouponInput,
  type CreatePlanInput,
  type UpdateBillingRuleInput,
  type UpdateCouponInput,
  type UpdatePlanInput,
} from "./billing";

// Typed operations for billing (S10), used identically by web and mobile. The admin operations need an
// admin's sign-in; everyone else is told "not found". Entitlement is read here, never sent.
export function createBillingClient(api: ApiClient) {
  return {
    getEntitlements: () => api.request({ method: "GET", path: "/api/v1/me/entitlements", schema: entitlementsSchema }),
    startCheckout: (planId: string) => api.request({ method: "POST", path: "/api/v1/me/checkout", body: { planId }, schema: checkoutResultSchema }),
    openBillingPortal: () => api.request({ method: "POST", path: "/api/v1/me/billing-portal", schema: checkoutResultSchema }),
    quoteCoupon: (code: string, planId: string) => api.request({ method: "POST", path: "/api/v1/me/coupons/quote", body: { code, planId }, schema: couponQuoteSchema }),
    admin: {
      listRules: () => api.request({ method: "GET", path: "/api/v1/admin/billing/rules", schema: billingRulesSchema }),
      updateRule: (accountType: AccountType, input: UpdateBillingRuleInput) => api.request({ method: "PUT", path: `/api/v1/admin/billing/rules/${accountType}`, body: input, schema: billingRuleSchema }),
      listPlans: () => api.request({ method: "GET", path: "/api/v1/admin/billing/plans", schema: planListSchema }),
      createPlan: (input: CreatePlanInput) => api.request({ method: "POST", path: "/api/v1/admin/billing/plans", body: input, schema: planSchema }),
      updatePlan: (id: string, input: UpdatePlanInput) => api.request({ method: "PATCH", path: `/api/v1/admin/billing/plans/${id}`, body: input, schema: planSchema }),
      listCoupons: () => api.request({ method: "GET", path: "/api/v1/admin/billing/coupons", schema: couponListSchema }),
      createCoupon: (input: CreateCouponInput) => api.request({ method: "POST", path: "/api/v1/admin/billing/coupons", body: input, schema: couponSchema }),
      updateCoupon: (id: string, input: UpdateCouponInput) => api.request({ method: "PATCH", path: `/api/v1/admin/billing/coupons/${id}`, body: input, schema: couponSchema }),
      listAudit: (limit = 50) => api.request({ method: "GET", path: "/api/v1/admin/billing/audit", query: { limit: String(limit) }, schema: billingAuditListSchema }),
    },
  };
}
