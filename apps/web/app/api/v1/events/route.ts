import { apiRoute } from "../../../../lib/api/route";
import { discoverRoutes } from "../../../../lib/api/discover";
import { getDiscoverService } from "../../../../lib/composition";

// Public event search: by place and distance, dates and kind of gathering. No sign-in; nothing is recorded about the searcher.
export const { GET } = discoverRoutes(apiRoute, getDiscoverService).search;
