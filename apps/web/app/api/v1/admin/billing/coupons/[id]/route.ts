import { apiRoute } from "../../../../../../../lib/api/route";
import { billingRoutes } from "../../../../../../../lib/api/billing";
import { getBillingService } from "../../../../../../../lib/composition";

// Admin: change a coupon.
export const { PATCH } = billingRoutes(apiRoute, getBillingService).coupon;
