import { apiRoute } from "../../../../../../../lib/api/route";
import { moderationRoutes } from "../../../../../../../lib/api/moderation";
import { getModerationService } from "../../../../../../../lib/composition";

// Admin: make a hidden event public again.
export const { POST } = moderationRoutes(apiRoute, getModerationService).restoreEvent;
