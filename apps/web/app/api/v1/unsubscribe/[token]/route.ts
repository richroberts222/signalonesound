import { apiRoute } from "../../../../../lib/api/route";
import { alertRoutes } from "../../../../../lib/api/alerts";
import { getAlertsService } from "../../../../../lib/composition";

// One-tap unsubscribe. Public: the signed link is the proof.
export const { POST } = alertRoutes(apiRoute, getAlertsService).unsubscribe;
