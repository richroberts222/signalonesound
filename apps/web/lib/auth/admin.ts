import type { AdminDirectory } from "../services/organizations";

/**
 * The platform admins: Clerk user ids from configuration (ADMIN_USER_IDS), never from the request,
 * the browser or the database (docs/permissions.md rule 8). An empty list means nobody is an admin.
 */
export function createAdminDirectory(userIds: readonly string[]): AdminDirectory {
  const ids = new Set(userIds);
  return { isAdmin: (userId) => userId !== "" && ids.has(userId) };
}
