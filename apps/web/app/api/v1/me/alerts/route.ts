import { apiRoute } from "../../../../../lib/api/route";
import { alertRoutes } from "../../../../../lib/api/alerts";
import { getAlertsService } from "../../../../../lib/composition";

// The caller's alerts: list and create (at most 10).
export const { GET, POST } = alertRoutes(apiRoute, getAlertsService).alerts;
