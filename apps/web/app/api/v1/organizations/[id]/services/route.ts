import { apiRoute } from "../../../../../../lib/api/route";
import { churchRoutes } from "../../../../../../lib/api/churches";
import { getChurchesService } from "../../../../../../lib/composition";

// A church's regular weekly services, replaced as a whole by its approved managers (S18).
export const { PUT } = churchRoutes(apiRoute, getChurchesService).services;
