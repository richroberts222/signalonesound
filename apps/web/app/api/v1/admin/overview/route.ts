import { apiRoute } from "../../../../../lib/api/route";
import { moderationRoutes } from "../../../../../lib/api/moderation";
import { getModerationService } from "../../../../../lib/composition";

// Admin: counts of what needs attention.
export const { GET } = moderationRoutes(apiRoute, getModerationService).overview;
