import "server-only";

import { auth } from "@clerk/nextjs/server";
import { UnauthenticatedError } from "./errors";

// The only place server code should read the Clerk session. Identity comes
// from Clerk's verified request context, never from client-supplied input.
// Mobile/API clients will reach the same helpers via Clerk's token-based
// request authentication once the API foundation exists.

/** Trusted Clerk user ID of the current request, or null when unauthenticated. */
export async function getUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId ?? null;
}

/** Trusted Clerk user ID; throws UnauthenticatedError when not signed in. */
export async function requireUserId(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new UnauthenticatedError();
  return userId;
}
