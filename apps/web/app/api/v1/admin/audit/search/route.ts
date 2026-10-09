import { apiRoute } from "../../../../../../lib/api/route";
import { moderationRoutes } from "../../../../../../lib/api/moderation";
import { getModerationService } from "../../../../../../lib/composition";

// Admin: the audit log, filtered by actor, subject and date.
export const { GET } = moderationRoutes(apiRoute, getModerationService).auditSearch;
