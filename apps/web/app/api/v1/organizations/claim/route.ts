import { apiRoute } from "../../../../../lib/api/route";
import { organizationRoutes } from "../../../../../lib/api/organizations";
import { getOrganizationsService } from "../../../../../lib/composition";

// Claim a Church/Ministry. Gives no rights until an admin approves.
export const { POST } = organizationRoutes(apiRoute, getOrganizationsService).claim;
