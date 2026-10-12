import { createAlertsClient, createApiClient, type FetchLike } from "@signalone/validation";

import { getMobileEnv } from "../config/env";

// The phone's door to the API for a member's alerts and notification settings (S7): the same shared client the web
// uses, with the Clerk session token as a bearer token. The server decides everything; nothing here stores alerts.
export type GetToken = () => Promise<string | null | undefined>;

export function createMobileAlertsClient(options: { getToken: GetToken; baseUrl?: string; fetch?: FetchLike }) {
  return createAlertsClient(createApiClient({ baseUrl: options.baseUrl ?? getMobileEnv().apiBaseUrl, getToken: options.getToken, fetch: options.fetch }));
}
