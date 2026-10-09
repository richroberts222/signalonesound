import { apiRoute } from "../../../../../../lib/api/route";
import { alertRoutes } from "../../../../../../lib/api/alerts";
import { getAlertsService } from "../../../../../../lib/composition";

// Edit, pause or delete one of the caller's alerts.
export const { PATCH, DELETE } = alertRoutes(apiRoute, getAlertsService).alert;
