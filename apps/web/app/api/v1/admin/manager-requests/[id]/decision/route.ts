import { apiRoute } from "../../../../../../../lib/api/route";
import { organizationRoutes } from "../../../../../../../lib/api/organizations";
import { getOrganizationsService } from "../../../../../../../lib/composition";

// Admin: approve or reject a claim, with a reason.
export const { POST } = organizationRoutes(apiRoute, getOrganizationsService).adminDecision;
