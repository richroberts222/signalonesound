import { apiRoute } from "../../../../../lib/api/route";
import { organizationRoutes } from "../../../../../lib/api/organizations";
import { getOrganizationsService } from "../../../../../lib/composition";

// GET is the public view of an approved organization; PATCH is for its managers.
export const { GET, PATCH } = organizationRoutes(apiRoute, getOrganizationsService).organization;
