import { apiRoute } from "../../../../../../lib/api/route";
import { billingRoutes } from "../../../../../../lib/api/billing";
import { getBillingService } from "../../../../../../lib/composition";

// Admin: give one member a fresh free trial (S13).
export const { PUT } = billingRoutes(apiRoute, getBillingService).trials;
