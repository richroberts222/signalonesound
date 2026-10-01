import "server-only";

import { getUserId } from "../auth/server";
import { createApiRoute } from "./handler";

// Production wiring of the API adapter: identity comes from Clerk's verified
// request context (session cookie for web, bearer token for mobile).
// Route files import `apiRoute` from here. No logging foundation exists yet;
// wire it to `onUnexpected` when it does (/docs/api.md).
export const apiRoute = createApiRoute({ getUserId });
