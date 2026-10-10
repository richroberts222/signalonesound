import { apiRoute } from "../../../../lib/api/route";
import { billingRoutes } from "../../../../lib/api/billing";
import { getBillingService } from "../../../../lib/composition";

// The active plans anyone may see (the Services page uses the same list). Inactive plans never appear.
export const { GET } = billingRoutes(apiRoute, getBillingService).publicPlans;
