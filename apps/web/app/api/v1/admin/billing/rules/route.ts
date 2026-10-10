import { apiRoute } from "../../../../../../lib/api/route";
import { billingRoutes } from "../../../../../../lib/api/billing";
import { getBillingService } from "../../../../../../lib/composition";

// Admin: read the billing rules (who pays).
export const { GET } = billingRoutes(apiRoute, getBillingService).rules;
