import { apiRoute } from "../../../../../lib/api/route";
import { savedRoutes } from "../../../../../lib/api/saved";
import { getSavedService } from "../../../../../lib/composition";

// Make an invite link for the caller to share.
export const { POST } = savedRoutes(apiRoute, getSavedService).invites;
