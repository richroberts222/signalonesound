import "server-only";

import { getUserId } from "../auth/server";
import { createApiRoute } from "./handler";
import { reportUnexpectedError } from "./report";

// Production wiring of the API adapter: identity comes from Clerk's verified
// request context (session cookie for web, bearer token for mobile), and
// unexpected errors go to the server-side report hook (never to clients).
// Route files import `apiRoute` from here.
export const apiRoute = createApiRoute({ getUserId, onUnexpected: reportUnexpectedError });
