import { apiRoute } from "../../../../../../lib/api/route";
import { alertRoutes } from "../../../../../../lib/api/alerts";
import { getAlertsService } from "../../../../../../lib/composition";

// Forget one of the caller's phones.
export const { DELETE } = alertRoutes(apiRoute, getAlertsService).pushToken;
