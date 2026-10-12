import { firesRoutes } from "../../../../../../lib/api/fires";
import { apiRoute } from "../../../../../../lib/api/route";
import { getFiresService } from "../../../../../../lib/composition";

// Give or take back one fire on an event, for the caller.
export const { GET, PUT, DELETE } = firesRoutes(apiRoute, getFiresService).fire;
