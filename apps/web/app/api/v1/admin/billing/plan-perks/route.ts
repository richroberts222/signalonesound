import { apiRoute } from "../../../../../../lib/api/route";
import { billingRoutes } from "../../../../../../lib/api/billing";
import { getBillingService } from "../../../../../../lib/composition";

// Admin: every plan's ticked perks.
export const { GET } = billingRoutes(apiRoute, getBillingService).planPerks;
