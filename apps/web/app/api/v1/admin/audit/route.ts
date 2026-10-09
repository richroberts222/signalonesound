import { apiRoute } from "../../../../../lib/api/route";
import { organizationRoutes } from "../../../../../lib/api/organizations";
import { getOrganizationsService } from "../../../../../lib/composition";

// Admin: the append-only audit log.
export const { GET } = organizationRoutes(apiRoute, getOrganizationsService).adminAudit;
