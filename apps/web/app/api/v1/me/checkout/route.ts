import { apiRoute } from "../../../../../lib/api/route";
import { billingRoutes } from "../../../../../lib/api/billing";
import { getBillingService } from "../../../../../lib/composition";

// Opens the payment provider's hosted checkout for an active member plan. Closed unless payments are switched on.
export const { POST } = billingRoutes(apiRoute, getBillingService).checkout;
