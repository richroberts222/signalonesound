import { apiRoute } from "../../../../../../../lib/api/route";
import { moderationRoutes } from "../../../../../../../lib/api/moderation";
import { getModerationService } from "../../../../../../../lib/composition";

// Admin: dismiss a report or mark it acted on.
export const { POST } = moderationRoutes(apiRoute, getModerationService).reportDecision;
