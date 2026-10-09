import { apiRoute } from "../../../../lib/api/route";
import { moderationRoutes } from "../../../../lib/api/moderation";
import { getModerationService } from "../../../../lib/composition";

// Report an event or a church. Public: no sign-in, and no reporter identity is kept.
export const { POST } = moderationRoutes(apiRoute, getModerationService).report;
