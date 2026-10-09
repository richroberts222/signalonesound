import { apiRoute } from "../../../../../lib/api/route";
import { savedRoutes } from "../../../../../lib/api/saved";
import { getSavedService } from "../../../../../lib/composition";

// The caller's saved events, upcoming first.
export const { GET } = savedRoutes(apiRoute, getSavedService).list;
