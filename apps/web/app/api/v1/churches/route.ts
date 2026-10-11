import { apiRoute } from "../../../../lib/api/route";
import { churchRoutes } from "../../../../lib/api/churches";
import { getChurchesService } from "../../../../lib/composition";

// The public Find a Church search (S18): by name or city, or by position and radius, nearest first.
export const { GET } = churchRoutes(apiRoute, getChurchesService).search;
