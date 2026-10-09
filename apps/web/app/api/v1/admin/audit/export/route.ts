import { apiRoute } from "../../../../../../lib/api/route";
import { moderationRoutes } from "../../../../../../lib/api/moderation";
import { getModerationService } from "../../../../../../lib/composition";

// Admin: the audit log for a legal request. The export is itself recorded in the audit log.
export const { GET } = moderationRoutes(apiRoute, getModerationService).auditExport;
