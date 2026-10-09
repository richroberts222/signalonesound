import { apiRoute } from "../../../../../../../lib/api/route";
import { moderationRoutes } from "../../../../../../../lib/api/moderation";
import { getModerationService } from "../../../../../../../lib/composition";

// Admin: unpublish a church or ministry.
export const { POST } = moderationRoutes(apiRoute, getModerationService).unpublishOrganization;
