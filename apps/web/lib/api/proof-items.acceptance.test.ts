import { createFakeProofItemRepo } from "../../db/proof-items.fake";
import { proofItemAcceptance } from "./proof-items.acceptance-suite";

// Default (secret-free) run of the acceptance criteria against an in-memory repo.
// The same criteria run against the real DEV database in
// db/proof-items.integration.test.ts (`pnpm test:integration`).
const repo = createFakeProofItemRepo();
proofItemAcceptance(() => ({ repo, cleanup: async () => {} }));
