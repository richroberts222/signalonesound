import { apiRoute } from "../../../../../../lib/api/route";
import { savedRoutes } from "../../../../../../lib/api/saved";
import { getSavedService } from "../../../../../../lib/composition";

// Count one arrival from an invite link (public; records nothing about the visitor).
export const { POST } = savedRoutes(apiRoute, getSavedService).arrival;
