import { apiRoute } from "../../../../../lib/api/route";
import { billingRoutes } from "../../../../../lib/api/billing";
import { getBillingService } from "../../../../../lib/composition";

// Opens the payment provider's customer page (change card, cancel) for someone with a subscription.
export const { POST } = billingRoutes(apiRoute, getBillingService).portal;
