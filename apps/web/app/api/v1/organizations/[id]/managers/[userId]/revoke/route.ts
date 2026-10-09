import { apiRoute } from "../../../../../../../../lib/api/route";
import { organizationRoutes } from "../../../../../../../../lib/api/organizations";
import { getOrganizationsService } from "../../../../../../../../lib/composition";

// Remove a manager: an admin or one of the organization's managers.
export const { POST } = organizationRoutes(apiRoute, getOrganizationsService).revoke;
