import { apiRoute } from "../../../../lib/api/route";
import { contactRoutes } from "../../../../lib/api/contact";
import { getContactService } from "../../../../lib/composition";

// The public contact form. Closed (not found) unless CONTACT_FORM_ENABLED is on.
export const { POST } = contactRoutes(apiRoute, getContactService).send;
