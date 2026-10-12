import { apiRoute } from "../../../../../../lib/api/route";
import { billingRoutes } from "../../../../../../lib/api/billing";
import { getBillingService } from "../../../../../../lib/composition";

// Opens the payment provider's hosted checkout for an active church plan, for the church's managers (S14). Closed unless payments are on.
export const { POST } = billingRoutes(apiRoute, getBillingService).organizationCheckout;
