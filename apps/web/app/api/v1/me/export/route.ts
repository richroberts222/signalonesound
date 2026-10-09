import { apiRoute } from "../../../../../lib/api/route";
import { memberRoutes } from "../../../../../lib/api/member";
import { getMemberService } from "../../../../../lib/composition";

// Everything held about the signed-in member, as JSON.
export const { GET } = memberRoutes(apiRoute, getMemberService).exportData;
