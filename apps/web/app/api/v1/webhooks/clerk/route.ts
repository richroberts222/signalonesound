import { apiRoute } from "../../../../../lib/api/route";
import { clerkWebhookRoutes } from "../../../../../lib/api/member";
import { verifyClerkWebhook } from "../../../../../lib/auth/clerk-webhook";
import { getMemberService } from "../../../../../lib/composition";

// Clerk calls this when a user is deleted or changed. Authenticated by signature, not by session.
export const { POST } = clerkWebhookRoutes(apiRoute, { verify: verifyClerkWebhook, getService: getMemberService });
