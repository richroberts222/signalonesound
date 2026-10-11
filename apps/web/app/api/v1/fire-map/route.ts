import { apiRoute } from "../../../../lib/api/route";
import { fireMapRoutes } from "../../../../lib/api/fire-map";
import { getFireMapService } from "../../../../lib/composition";

// The public Fire Map: fires and the two honest numbers for the world and the United States (S16).
export const { GET } = fireMapRoutes(apiRoute, getFireMapService).get;
