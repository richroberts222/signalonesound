import { apiRoute } from "../../../../../../lib/api/route";
import { notificationJobRoutes } from "../../../../../../lib/api/alerts";
import { isJobRequestAuthorized } from "../../../../../../lib/auth/job-secret";
import { getCronSecret, getNotifier } from "../../../../../../lib/composition";

// Queues reminders, sends what is due and clears old rows. Called by the platform scheduler with the
// CRON_SECRET; refused without it.
export const { GET } = notificationJobRoutes(apiRoute, {
  authorized: (request) => isJobRequestAuthorized(request, getCronSecret()),
  notifier: getNotifier,
}).run;
