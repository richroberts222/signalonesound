import { parseClientEnv, type ClientEnv } from "@signalone/shared";

// Client-safe configuration only. Next.js inlines NEXT_PUBLIC_* values only for
// literal `process.env.NAME` reads, so each is listed explicitly. Never add a
// secret here; anything read here is public in the browser bundle.
export function getClientEnv(): ClientEnv {
  return parseClientEnv({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  });
}
