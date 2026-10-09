import { apiRoute } from "../../../../../lib/api/route";
import { eventRoutes } from "../../../../../lib/api/events";
import { getEventsService } from "../../../../../lib/composition";

// One event for its managers: read, edit (this occurrence or the series), soft delete.
export const { GET, PATCH, DELETE } = eventRoutes(apiRoute, getEventsService).event;
