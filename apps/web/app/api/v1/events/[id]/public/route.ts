import { apiRoute } from "../../../../../../lib/api/route";
import { discoverRoutes } from "../../../../../../lib/api/discover";
import { getDiscoverService } from "../../../../../../lib/composition";

// One event as the public sees it (published or cancelled; anything else does not exist).
export const { GET } = discoverRoutes(apiRoute, getDiscoverService).event;
