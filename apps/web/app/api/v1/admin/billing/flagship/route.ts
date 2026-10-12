import { apiRoute } from "../../../../../../lib/api/route";
import { billingRoutes } from "../../../../../../lib/api/billing";
import { getBillingService } from "../../../../../../lib/composition";

// Admin: the free-for-life (flagship) places for churches and ministries (S14).
export const { GET, PUT } = billingRoutes(apiRoute, getBillingService).flagship;
