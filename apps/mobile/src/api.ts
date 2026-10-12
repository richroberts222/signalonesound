import { createApiClient, createChurchClient, createDiscoverClient } from "@signalone/validation";

import { currentToken } from "./auth/TokenBridge";
import { getMobileEnv } from "./config/env";
import { createMobileProfileClient } from "./account/profileClient";
import { createMobileAlertsClient } from "./alerts/alertsClient";
import { createMobileFireClient } from "./fire/fireClient";
import { createMobileSavedClient } from "./saved/savedClient";

// The phone's one door to the API for discovery: the same shared client the web uses, with the base URL from
// the public app settings. Discovery needs no sign-in and sends no token, so nothing identifies a visitor
// who is only browsing (S5 AC2).
let discover: ReturnType<typeof createDiscoverClient> | undefined;

export function getDiscoverClient() {
  return (discover ??= createDiscoverClient(createApiClient({ baseUrl: getMobileEnv().apiBaseUrl })));
}

// Find a Church (S18): the same shared client, public reads only, so no token and no identifier.
let churches: ReturnType<typeof createChurchClient> | undefined;

export function getChurchClient() {
  return (churches ??= createChurchClient(createApiClient({ baseUrl: getMobileEnv().apiBaseUrl })));
}

// The member's alerts, reminders and quiet hours (S7): the same shared client, with the session token as a bearer token.
let alerts: ReturnType<typeof createMobileAlertsClient> | undefined;

export function getAlertsClient() {
  return (alerts ??= createMobileAlertsClient({ getToken: currentToken }));
}

// The member's fires (S19): the same shared client, with the session token as a bearer token.
let fires: ReturnType<typeof createMobileFireClient> | undefined;

export function getFireClient() {
  return (fires ??= createMobileFireClient({ getToken: currentToken }));
}

// The member's saved events (S6): the same shared client, with the session token as a bearer token. Used only
// where a person is signed in; without one the server answers "unauthenticated".
let saved: ReturnType<typeof createMobileSavedClient> | undefined;

export function getSavedClient() {
  return (saved ??= createMobileSavedClient({ getToken: currentToken }));
}

// The member's own profile, policy acceptance, data export and account deletion (S1): the same shared client.
let profile: ReturnType<typeof createMobileProfileClient> | undefined;

export function getProfileClient() {
  return (profile ??= createMobileProfileClient({ getToken: currentToken }));
}
