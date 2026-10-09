import "server-only";

import { createHelloRepo } from "../db/hello";
import { createProofItemRepo } from "../db/proof-items";
import { getDb } from "../db";
import { createHelloService, type HelloService } from "./services/hello";
import { createProofItemService, type ProofItemService } from "./services/proof-items";

// Composition root (/docs/services.md): the only place that wires `getDb()` to
// data access and data access to services. Lazy, so `next build` needs no
// database environment and the first request fails fast if it is invalid.
let proofItems: ProofItemService | undefined;

export function getProofItemService(): ProofItemService {
  return (proofItems ??= createProofItemService({ repo: createProofItemRepo(getDb()) }));
}

let hello: HelloService | undefined;

export function getHelloService(): HelloService {
  return (hello ??= createHelloService({ repo: createHelloRepo(getDb()) }));
}
