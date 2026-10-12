import { apiRoute } from "../../../../../../lib/api/route";
import { billingRoutes } from "../../../../../../lib/api/billing";
import { getBillingService } from "../../../../../../lib/composition";

// A church's derived plan state, for its approved managers and admins (S14).
export const { GET } = billingRoutes(apiRoute, getBillingService).organizationEntitlement;
