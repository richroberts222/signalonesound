import { randomUUID } from "node:crypto";

import { DatabaseError } from "./errors";
import type { ProofItemRepo, ProofItemRow } from "./proof-items";

// Test-only in-memory stand-in for the proof item repo. It mimics the database
// behaviors the service relies on: the unique (owner, label) constraint raises
// the same DatabaseError kind, and ordering is by creation. Never used in
// application code.
export function createFakeProofItemRepo(): ProofItemRepo {
  const rows: ProofItemRow[] = [];
  let tick = 0;
  return {
    async listByOwner(ownerId) {
      return rows.filter((r) => r.ownerId === ownerId).map((r) => ({ ...r }));
    },
    async countByOwner(ownerId) {
      return rows.filter((r) => r.ownerId === ownerId).length;
    },
    async findById(id) {
      const row = rows.find((r) => r.id === id);
      return row ? { ...row } : null;
    },
    async insert(ownerId, label) {
      if (rows.some((r) => r.ownerId === ownerId && r.label === label)) {
        throw new DatabaseError("unique_violation", "proofItem.insert", new Error("duplicate"));
      }
      const row: ProofItemRow = {
        id: randomUUID(),
        ownerId,
        label,
        createdAt: new Date(Date.UTC(2026, 0, 1) + tick++ * 1000),
      };
      rows.push(row);
      return { ...row };
    },
    async deleteOwned(id, ownerId) {
      const index = rows.findIndex((r) => r.id === id && r.ownerId === ownerId);
      if (index < 0) return false;
      rows.splice(index, 1);
      return true;
    },
  };
}
