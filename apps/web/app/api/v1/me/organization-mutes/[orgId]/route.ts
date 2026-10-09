import { apiRoute } from "../../../../../../lib/api/route";
import { alertRoutes } from "../../../../../../lib/api/alerts";
import { getAlertsService } from "../../../../../../lib/composition";

// Stop (or resume) hearing about one church.
export const { PUT, DELETE } = alertRoutes(apiRoute, getAlertsService).mute;
