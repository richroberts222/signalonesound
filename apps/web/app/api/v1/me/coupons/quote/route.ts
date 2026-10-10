import { apiRoute } from "../../../../../../lib/api/route";
import { billingRoutes } from "../../../../../../lib/api/billing";
import { getBillingService } from "../../../../../../lib/composition";

// Read-only price a coupon would give for a plan.
export const { POST } = billingRoutes(apiRoute, getBillingService).quote;
