import { apiRoute } from "../../../../../lib/api/route";
import { organizationRoutes } from "../../../../../lib/api/organizations";
import { getOrganizationsService } from "../../../../../lib/composition";

// Admin: claims waiting for a decision.
export const { GET } = organizationRoutes(apiRoute, getOrganizationsService).adminRequests;
