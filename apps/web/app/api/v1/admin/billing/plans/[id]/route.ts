import { apiRoute } from "../../../../../../../lib/api/route";
import { billingRoutes } from "../../../../../../../lib/api/billing";
import { getBillingService } from "../../../../../../../lib/composition";

// Admin: change a plan (a new price is a new version).
export const { PATCH } = billingRoutes(apiRoute, getBillingService).plan;
