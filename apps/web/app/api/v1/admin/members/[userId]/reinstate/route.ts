import { apiRoute } from "../../../../../../../lib/api/route";
import { moderationRoutes } from "../../../../../../../lib/api/moderation";
import { getModerationService } from "../../../../../../../lib/composition";

// Admin: reinstate a suspended member.
export const { POST } = moderationRoutes(apiRoute, getModerationService).reinstate;
