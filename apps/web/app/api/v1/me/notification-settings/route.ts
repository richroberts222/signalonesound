import { apiRoute } from "../../../../../lib/api/route";
import { alertRoutes } from "../../../../../lib/api/alerts";
import { getAlertsService } from "../../../../../lib/composition";

// The caller's notification settings (reminders on or off).
export const { GET, PUT } = alertRoutes(apiRoute, getAlertsService).settings;
