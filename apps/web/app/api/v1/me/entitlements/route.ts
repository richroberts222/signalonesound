import { apiRoute } from "../../../../../lib/api/route";
import { billingRoutes } from "../../../../../lib/api/billing";
import { getBillingService } from "../../../../../lib/composition";

// The signed-in person's derived entitlement.
export const { GET } = billingRoutes(apiRoute, getBillingService).entitlements;
