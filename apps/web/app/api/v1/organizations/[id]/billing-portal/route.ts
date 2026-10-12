import { apiRoute } from "../../../../../../lib/api/route";
import { billingRoutes } from "../../../../../../lib/api/billing";
import { getBillingService } from "../../../../../../lib/composition";

// The provider's customer page for a church with a subscription, for its managers (S14).
export const { POST } = billingRoutes(apiRoute, getBillingService).organizationPortal;
