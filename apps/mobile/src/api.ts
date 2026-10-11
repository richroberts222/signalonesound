import { createApiClient, createDiscoverClient } from "@signalone/validation";

import { currentToken } from "./auth/TokenBridge";
import { getMobileEnv } from "./config/env";
import { createMobileSavedClient } from "./saved/savedClient";

// The phone's one door to the API for discovery: the same shared client the web uses, with the base URL from
// the public app settings. Discovery needs no sign-in and sends no token, so nothing identifies a visitor
// who is only browsing (S5 AC2).
let discover: ReturnType<typeof createDiscoverClient> | undefined;

export function getDiscoverClient() {
  return (discover ??= createDiscoverClient(createApiClient({ baseUrl: getMobileEnv().apiBaseUrl })));
}

// The member's saved events (S6): the same shared client, with the session token as a bearer token. Used only
// where a person is signed in; without one the server answers "unauthenticated".
let saved: ReturnType<typeof createMobileSavedClient> | undefined;

export function getSavedClient() {
  return (saved ??= createMobileSavedClient({ getToken: currentToken }));
}
