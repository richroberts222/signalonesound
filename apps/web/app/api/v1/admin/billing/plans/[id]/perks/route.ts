import { apiRoute } from "../../../../../../../../lib/api/route";
import { billingRoutes } from "../../../../../../../../lib/api/billing";
import { getBillingService } from "../../../../../../../../lib/composition";

// Admin: set the perks a plan includes.
export const { PUT } = billingRoutes(apiRoute, getBillingService).planPerksSet;
