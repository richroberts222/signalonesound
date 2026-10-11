import { createApiClient, createSavedClient, type FetchLike } from "@signalone/validation";

import { getMobileEnv } from "../config/env";

// The phone's door to the API for a member's saved events and invites (S6): the same shared client the web uses.
// Only the transport differs: an absolute base URL and the Clerk session token as a bearer token. The server decides
// everything (who the member is, what may be saved); nothing here stores the list or reads the database.
export type GetToken = () => Promise<string | null | undefined>;

export function createMobileSavedClient(options: { getToken: GetToken; baseUrl?: string; fetch?: FetchLike }) {
  return createSavedClient(createApiClient({ baseUrl: options.baseUrl ?? getMobileEnv().apiBaseUrl, getToken: options.getToken, fetch: options.fetch }));
}
