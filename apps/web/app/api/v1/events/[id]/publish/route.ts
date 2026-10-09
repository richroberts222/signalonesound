import { apiRoute } from "../../../../../../lib/api/route";
import { eventRoutes } from "../../../../../../lib/api/events";
import { getEventsService } from "../../../../../../lib/composition";

// Make a draft public.
export const { POST } = eventRoutes(apiRoute, getEventsService).publish;
