import "server-only";

import { createMemberRepo } from "../db/member";
import { createProofItemRepo } from "../db/proof-items";
import { clerkIdentityAdmin } from "./auth/clerk-identity-admin";
import { getDb } from "../db";
import { createMemberService, type MemberService } from "./services/member";
import { createProofItemService, type ProofItemService } from "./services/proof-items";

// Composition root (/docs/services.md): the only place that wires `getDb()` to
// data access and data access to services. Lazy, so `next build` needs no
// database environment and the first request fails fast if it is invalid.
let proofItems: ProofItemService | undefined;

export function getProofItemService(): ProofItemService {
  return (proofItems ??= createProofItemService({ repo: createProofItemRepo(getDb()) }));
}

let member: MemberService | undefined;

export function getMemberService(): MemberService {
  return (member ??= createMemberService({ repo: createMemberRepo(getDb()), identity: clerkIdentityAdmin }));
}
