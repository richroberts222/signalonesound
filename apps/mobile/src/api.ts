import { createApiClient, createDiscoverClient } from "@signalone/validation";

import { getMobileEnv } from "./config/env";

// The phone's one door to the API for discovery: the same shared client the web uses, with the base URL from
// the public app settings. Discovery needs no sign-in and sends no token, so nothing identifies a visitor
// who is only browsing (S5 AC2).
let discover: ReturnType<typeof createDiscoverClient> | undefined;

export function getDiscoverClient() {
  return (discover ??= createDiscoverClient(createApiClient({ baseUrl: getMobileEnv().apiBaseUrl })));
}
