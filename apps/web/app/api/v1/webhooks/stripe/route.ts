import { apiRoute } from "../../../../../lib/api/route";
import { billingRoutes } from "../../../../../lib/api/billing";
import { getBillingService } from "../../../../../lib/composition";

// The payment provider's notification (S11). Public because it carries no sign-in, but it is only accepted with
// a valid signature on the raw body, and a replay of an event already applied changes nothing.
export const { POST } = billingRoutes(apiRoute, getBillingService).webhook;
