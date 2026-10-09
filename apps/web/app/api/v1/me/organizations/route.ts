import { apiRoute } from "../../../../../lib/api/route";
import { organizationRoutes } from "../../../../../lib/api/organizations";
import { getOrganizationsService } from "../../../../../lib/composition";

// The caller's own organizations and their standing in each.
export const { GET } = organizationRoutes(apiRoute, getOrganizationsService).mine;
