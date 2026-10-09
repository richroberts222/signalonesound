import { apiRoute } from "../../../../../../lib/api/route";
import { eventRoutes } from "../../../../../../lib/api/events";
import { getEventsService } from "../../../../../../lib/composition";

// POST creates an event (or a recurring series); GET lists an organization's events for its managers.
export const { POST, GET } = eventRoutes(apiRoute, getEventsService).orgEvents;
