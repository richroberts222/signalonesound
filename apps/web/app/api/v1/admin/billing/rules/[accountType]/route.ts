import { apiRoute } from "../../../../../../../lib/api/route";
import { billingRoutes } from "../../../../../../../lib/api/billing";
import { getBillingService } from "../../../../../../../lib/composition";

// Admin: change the billing rule for one account type.
export const { PUT } = billingRoutes(apiRoute, getBillingService).rule;
