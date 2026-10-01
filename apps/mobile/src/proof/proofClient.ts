import { createApiClient, createProofItemClient, type FetchLike } from "@signalone/validation";

import { getMobileEnv } from "../config/env";

// Mobile's API boundary for the generic proof feature (Issue 49). It is the SAME
// shared client the web uses (@signalone/validation); only the transport inputs
// differ: an absolute base URL from EXPO_PUBLIC_API_BASE_URL and a bearer token.
// No business logic, no database, no server code here.
export type TokenProvider = () => Promise<string | null>;

/**
 * Clerk is not integrated into the mobile app yet (/docs/mobile.md), so there is
 * no real token source. Until then the app sends no token and the API correctly
 * answers `unauthenticated`. Replace this with Clerk's `getToken` when
 * `@clerk/expo` is added.
 */
export const noToken: TokenProvider = async () => null;

export function createMobileProofClient(options: {
  baseUrl?: string;
  getToken?: TokenProvider;
  fetch?: FetchLike;
}) {
  return createProofItemClient(
    createApiClient({
      baseUrl: options.baseUrl ?? getMobileEnv().apiBaseUrl,
      getToken: options.getToken ?? noToken,
      fetch: options.fetch,
    }),
  );
}
