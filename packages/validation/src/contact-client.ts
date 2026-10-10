import type { ApiClient } from "./api-client";
import {
  contactDeletedSchema,
  contactMessageListSchema,
  contactMessageSchema,
  contactReceivedSchema,
  type CreateContactInput,
  type UpdateContactInput,
} from "./contact";

// Typed operations for the contact form (public) and the admin Messages inbox (admins only; everyone else
// is told "not found"). Used identically by web and mobile.
export function createContactClient(api: ApiClient) {
  return {
    send: (input: CreateContactInput) => api.request({ method: "POST", path: "/api/v1/contact", body: input, schema: contactReceivedSchema }),
    admin: {
      list: (status: "new" | "done" | "all" = "all") => api.request({ method: "GET", path: "/api/v1/admin/contact-messages", query: { status }, schema: contactMessageListSchema }),
      setStatus: (id: string, input: UpdateContactInput) => api.request({ method: "PATCH", path: `/api/v1/admin/contact-messages/${id}`, body: input, schema: contactMessageSchema }),
      remove: (id: string) => api.request({ method: "DELETE", path: `/api/v1/admin/contact-messages/${id}`, schema: contactDeletedSchema }),
    },
  };
}
