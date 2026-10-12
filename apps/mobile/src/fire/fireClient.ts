import { createApiClient, createFireClient, type FetchLike } from "@signalone/validation";

import { getMobileEnv } from "../config/env";

// The phone's door to the API for a member's fires (S19): the same shared client the web uses, with the Clerk
// session token as a bearer token. The server decides everything (who the member is, what may be fired, the
// daily limit); nothing here stores fires or reads the database.
export type GetToken = () => Promise<string | null | undefined>;

export function createMobileFireClient(options: { getToken: GetToken; baseUrl?: string; fetch?: FetchLike }) {
  return createFireClient(createApiClient({ baseUrl: options.baseUrl ?? getMobileEnv().apiBaseUrl, getToken: options.getToken, fetch: options.fetch }));
}
