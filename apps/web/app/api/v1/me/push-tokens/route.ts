import { apiRoute } from "../../../../../lib/api/route";
import { alertRoutes } from "../../../../../lib/api/alerts";
import { getAlertsService } from "../../../../../lib/composition";

// Remember a phone's push address for the caller.
export const { POST } = alertRoutes(apiRoute, getAlertsService).pushTokens;
