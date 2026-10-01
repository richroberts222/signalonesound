// Client-safe configuration: values that are intentionally public. Only
// NEXT_PUBLIC_* variables may be read here, and each must be referenced
// literally so Next.js can inline it. Never add secrets or database values.
import { EnvError } from "./app-env";

export type ClientEnv = {
  clerkPublishableKey: string;
};

export function parseClientEnv(source: {
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
}): ClientEnv {
  const clerkPublishableKey = source.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!clerkPublishableKey) {
    throw new EnvError("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set.");
  }
  return { clerkPublishableKey };
}

export function getClientEnv(): ClientEnv {
  return parseClientEnv({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  });
}
