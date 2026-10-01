import type { ProofItem, ProofItemList } from "@signalone/validation";

import type { ProofItemRow } from "../../db/proof-items";
import { authorize, isOwner } from "../auth/authorize";
import type { ServiceContext } from "./context";
import { conflict, notFound } from "./errors";

// Service for the generic proof feature (Issue 49). Not a domain service: it
// demonstrates the conventions in /docs/services.md. Business rules live here:
// the per-user item cap, ownership scoping, and authorization. Framework-free
// (type-only import of the row type); the repo is injected.

/** Business rule: a single user may hold at most this many proof items. */
export const MAX_PROOF_ITEMS_PER_USER = 20;

export type ProofItemServiceDeps = {
  repo: {
    listByOwner(ownerId: string): Promise<ProofItemRow[]>;
    countByOwner(ownerId: string): Promise<number>;
    findById(id: string): Promise<ProofItemRow | null>;
    insert(ownerId: string, label: string): Promise<ProofItemRow>;
    deleteOwned(id: string, ownerId: string): Promise<boolean>;
  };
};

// Rows are mapped to the public contract so schema changes do not leak.
const toPublic = (row: ProofItemRow): ProofItem => ({
  id: row.id,
  label: row.label,
  createdAt: row.createdAt.toISOString(),
});

const isProofItemOwner = isOwner<ProofItemRow>((row) => row.ownerId);

export function createProofItemService({ repo }: ProofItemServiceDeps) {
  return {
    /** Lists only the caller's items. */
    async list(ctx: ServiceContext): Promise<ProofItemList> {
      const rows = await repo.listByOwner(ctx.actor.userId);
      return { items: rows.map(toPublic) };
    },

    /** Owner is always the caller. Enforces the cap; duplicate labels surface as `conflict` from the database constraint. */
    async create(ctx: ServiceContext, input: { label: string }): Promise<ProofItem> {
      const count = await repo.countByOwner(ctx.actor.userId);
      if (count >= MAX_PROOF_ITEMS_PER_USER) throw conflict("Item limit reached");
      return toPublic(await repo.insert(ctx.actor.userId, input.label));
    },

    /** Missing -> not_found; someone else's item -> forbidden (authorize); otherwise deleted. */
    async remove(ctx: ServiceContext, input: { id: string }): Promise<{ id: string }> {
      const row = await repo.findById(input.id);
      if (!row) throw notFound();
      await authorize(ctx.actor, isProofItemOwner, row);
      // Delete is scoped to the owner again so a race cannot remove another user's row.
      if (!(await repo.deleteOwned(row.id, ctx.actor.userId))) throw notFound();
      return { id: row.id };
    },
  };
}

export type ProofItemService = ReturnType<typeof createProofItemService>;
