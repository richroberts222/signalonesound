import { z } from "zod";

// GENERIC PROOF FEATURE (Issue 49). A deliberately disposable "proof item" that
// exists only to prove the Web/Mobile -> API -> service -> data access ->
// database path. It is NOT a Signal One domain concept. To remove it, follow
// "Removing the proof feature" in /docs/api.md (or search "proof-item"/"proofItem").
//
// These are public wire contracts: independent of database row types.

export const PROOF_ITEMS_PATH = "/api/v1/proof-items";
export const PROOF_ITEM_LABEL_MAX = 40;

export const createProofItemSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Label is required")
    .max(PROOF_ITEM_LABEL_MAX, `Label must be at most ${PROOF_ITEM_LABEL_MAX} characters`),
});
export type CreateProofItemInput = z.infer<typeof createProofItemSchema>;

export const deleteProofItemQuerySchema = z.object({ id: z.string().uuid("Invalid id") });
export type DeleteProofItemQuery = z.infer<typeof deleteProofItemQuerySchema>;

/** What clients see. `createdAt` is an ISO-8601 string. */
export const proofItemSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  createdAt: z.string(),
});
export type ProofItem = z.infer<typeof proofItemSchema>;

export const proofItemListSchema = z.object({ items: z.array(proofItemSchema) });
export type ProofItemList = z.infer<typeof proofItemListSchema>;

export const deletedProofItemSchema = z.object({ id: z.string().uuid() });
