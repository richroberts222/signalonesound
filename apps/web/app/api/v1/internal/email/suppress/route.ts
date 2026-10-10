import { apiRoute } from "../../../../../../lib/api/route";
import { emailSuppressionRoutes } from "../../../../../../lib/api/email";
import { isJobRequestAuthorized } from "../../../../../../lib/auth/job-secret";
import { getCronSecret, getEmailSuppressionRepo, getEmailSuppressionSalt } from "../../../../../../lib/composition";

// Records an address that bounced or complained, so it is never emailed again. Called by the email
// provider's notification forwarder with the CRON_SECRET; refused without it.
export const { POST } = emailSuppressionRoutes(apiRoute, {
  authorized: (request) => isJobRequestAuthorized(request, getCronSecret()),
  repo: getEmailSuppressionRepo,
  salt: getEmailSuppressionSalt,
}).suppress;
