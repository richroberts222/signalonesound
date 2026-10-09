import { apiRoute } from "../../../../../../../lib/api/route";
import { moderationRoutes } from "../../../../../../../lib/api/moderation";
import { getModerationService } from "../../../../../../../lib/composition";

// Admin: hide an event from the public.
export const { POST } = moderationRoutes(apiRoute, getModerationService).hideEvent;
