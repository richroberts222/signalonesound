import { apiRoute } from "../../../../../lib/api/route";
import { discoverRoutes } from "../../../../../lib/api/discover";
import { getDiscoverService } from "../../../../../lib/composition";

// Turns a typed place (a ZIP code or City, ST) into positions, from data shipped with the app.
export const { GET } = discoverRoutes(apiRoute, getDiscoverService).places;
