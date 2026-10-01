import { apiRoute } from "../../../../lib/api/route";
import { proofItemRoutes } from "../../../../lib/api/proof-items";
import { getProofItemService } from "../../../../lib/composition";

// Generic proof endpoints (Issue 49): GET list, POST create, DELETE ?id=.
export const { GET, POST, DELETE } = proofItemRoutes(apiRoute, getProofItemService);
