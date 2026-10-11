import { apiRoute } from "../../../../../../lib/api/route";
import { churchRoutes } from "../../../../../../lib/api/churches";
import { getChurchesService } from "../../../../../../lib/composition";

// A church's address, pin and time zone, saved by its approved managers (S18).
export const { PUT } = churchRoutes(apiRoute, getChurchesService).profile;
