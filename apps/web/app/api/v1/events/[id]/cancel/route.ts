import { apiRoute } from "../../../../../../lib/api/route";
import { eventRoutes } from "../../../../../../lib/api/events";
import { getEventsService } from "../../../../../../lib/composition";

// Mark a published event cancelled.
export const { POST } = eventRoutes(apiRoute, getEventsService).cancel;
