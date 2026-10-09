import { apiRoute } from "../../../../../lib/api/route";
import { moderationRoutes } from "../../../../../lib/api/moderation";
import { getModerationService } from "../../../../../lib/composition";

// Admin: the report queue.
export const { GET } = moderationRoutes(apiRoute, getModerationService).reports;
