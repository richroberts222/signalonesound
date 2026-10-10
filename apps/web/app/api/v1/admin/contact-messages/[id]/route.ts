import { apiRoute } from "../../../../../../lib/api/route";
import { contactRoutes } from "../../../../../../lib/api/contact";
import { getContactService } from "../../../../../../lib/composition";

// Admin: mark a message done, or delete it.
export const { PATCH, DELETE } = contactRoutes(apiRoute, getContactService).one;
