import { apiRoute } from "../../../../../../lib/api/route";
import { billingRoutes } from "../../../../../../lib/api/billing";
import { getBillingService } from "../../../../../../lib/composition";

// Admin: the billing audit log.
export const { GET } = billingRoutes(apiRoute, getBillingService).audit;
