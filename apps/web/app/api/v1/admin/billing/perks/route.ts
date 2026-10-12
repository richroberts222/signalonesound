import { apiRoute } from "../../../../../../lib/api/route";
import { billingRoutes } from "../../../../../../lib/api/billing";
import { getBillingService } from "../../../../../../lib/composition";

// Admin: list and create perks (what plans can include).
export const { GET, POST } = billingRoutes(apiRoute, getBillingService).perks;
