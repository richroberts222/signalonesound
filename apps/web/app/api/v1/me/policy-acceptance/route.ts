import { apiRoute } from "../../../../../lib/api/route";
import { memberRoutes } from "../../../../../lib/api/member";
import { getMemberService } from "../../../../../lib/composition";

// Accept the current Terms and Privacy Policy and attest to being 18 or older.
export const { POST } = memberRoutes(apiRoute, getMemberService).policyAcceptance;
