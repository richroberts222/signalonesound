import { apiRoute } from "../../../../../lib/api/route";
import { churchRoutes } from "../../../../../lib/api/churches";
import { getChurchesService } from "../../../../../lib/composition";

// One approved church with its address and regular services, public (S18).
export const { GET } = churchRoutes(apiRoute, getChurchesService).church;
