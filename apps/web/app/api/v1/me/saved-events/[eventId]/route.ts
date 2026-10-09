import { apiRoute } from "../../../../../../lib/api/route";
import { savedRoutes } from "../../../../../../lib/api/saved";
import { getSavedService } from "../../../../../../lib/composition";

// Save or remove one event for the caller.
export const { GET, PUT, DELETE } = savedRoutes(apiRoute, getSavedService).saved;
