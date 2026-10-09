import { apiRoute } from "../../../../../../../lib/api/route";
import { moderationRoutes } from "../../../../../../../lib/api/moderation";
import { getModerationService } from "../../../../../../../lib/composition";

// Admin: suspend a member.
export const { POST } = moderationRoutes(apiRoute, getModerationService).suspend;
