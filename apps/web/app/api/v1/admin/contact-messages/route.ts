import { apiRoute } from "../../../../../lib/api/route";
import { contactRoutes } from "../../../../../lib/api/contact";
import { getContactService } from "../../../../../lib/composition";

// Admin: the Messages inbox.
export const { GET } = contactRoutes(apiRoute, getContactService).list;
