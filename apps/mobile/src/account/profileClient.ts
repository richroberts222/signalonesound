import { createApiClient, createProfileClient, type FetchLike } from "@signalone/validation";

import { getMobileEnv } from "../config/env";

// The phone's door to the API for the member's own profile (S1): the same shared client the web uses, with the Clerk
// session token as a bearer token. The server decides everything; nothing here stores the profile.
export type GetToken = () => Promise<string | null | undefined>;

export function createMobileProfileClient(options: { getToken: GetToken; baseUrl?: string; fetch?: FetchLike }) {
  return createProfileClient(createApiClient({ baseUrl: options.baseUrl ?? getMobileEnv().apiBaseUrl, getToken: options.getToken, fetch: options.fetch }));
}
