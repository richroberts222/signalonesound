import "server-only";

import { createProofItemRepo } from "../db/proof-items";
import { getDb } from "../db";
import { createProofItemService, type ProofItemService } from "./services/proof-items";

// Composition root (/docs/services.md): the only place that wires `getDb()` to
// data access and data access to services. Lazy, so `next build` needs no
// database environment and the first request fails fast if it is invalid.
let proofItems: ProofItemService | undefined;

export function getProofItemService(): ProofItemService {
  return (proofItems ??= createProofItemService({ repo: createProofItemRepo(getDb()) }));
}
