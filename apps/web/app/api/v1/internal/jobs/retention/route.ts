import { apiRoute } from "../../../../../../lib/api/route";
import { jobRoutes } from "../../../../../../lib/api/saved";
import { isJobRequestAuthorized } from "../../../../../../lib/auth/job-secret";
import { getCronSecret, getModerationService, getSavedService } from "../../../../../../lib/composition";

// Daily retention: saved events 30 days after the event ended, and expired invite links. Called by the
// platform scheduler with the CRON_SECRET; refused without it.
export const { GET } = jobRoutes(apiRoute, {
  authorized: (request) => isJobRequestAuthorized(request, getCronSecret()),
  retention: async () => ({ ...(await getSavedService().purge()), rateLimitsRemoved: await getModerationService().purgeRateLimits() }),
}).retention;
