import type { ApiClient } from "./api-client";
import {
  PROOF_ITEMS_PATH,
  deletedProofItemSchema,
  proofItemListSchema,
  proofItemSchema,
  type CreateProofItemInput,
} from "./proof-item";

// PROOF-ONLY (see /docs/boilerplate.md): removed from a newly initialized app.
/** Typed operations for the generic proof feature, used identically by Web and Mobile. */
export function createProofItemClient(api: ApiClient) {
  return {
    list: () => api.request({ method: "GET", path: PROOF_ITEMS_PATH, schema: proofItemListSchema }),
    create: (input: CreateProofItemInput) =>
      api.request({ method: "POST", path: PROOF_ITEMS_PATH, body: input, schema: proofItemSchema }),
    remove: (id: string) =>
      api.request({ method: "DELETE", path: PROOF_ITEMS_PATH, query: { id }, schema: deletedProofItemSchema }),
  };
}
