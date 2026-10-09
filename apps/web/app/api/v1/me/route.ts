import { apiRoute } from "../../../../lib/api/route";
import { memberRoutes } from "../../../../lib/api/member";
import { getMemberService } from "../../../../lib/composition";

// The member's own profile: GET reads (and creates on first sign-in), PATCH edits allowed fields,
// DELETE removes the account and its data.
export const { GET, PATCH, DELETE } = memberRoutes(apiRoute, getMemberService).me;
