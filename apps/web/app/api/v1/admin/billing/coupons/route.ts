import { apiRoute } from "../../../../../../lib/api/route";
import { billingRoutes } from "../../../../../../lib/api/billing";
import { getBillingService } from "../../../../../../lib/composition";

// Admin: list and create coupons.
export const { GET, POST } = billingRoutes(apiRoute, getBillingService).coupons;
