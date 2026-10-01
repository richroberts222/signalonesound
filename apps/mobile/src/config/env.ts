import { parseMobileClientEnv, type MobileClientEnv } from "@signalone/shared";

// Client-safe configuration only. Expo inlines EXPO_PUBLIC_* values only for
// literal property reads of the environment object, so each is listed explicitly. Everything
// here is public in the app bundle: never add a secret, database credential,
// or Clerk secret key. See /docs/environment.md and /docs/mobile.md.
export function getMobileEnv(): MobileClientEnv {
  return parseMobileClientEnv({
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });
}
