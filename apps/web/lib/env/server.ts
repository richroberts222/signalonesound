import "server-only";

import { parseServerEnv, type ServerEnv } from "@signalone/shared";

// Server-only configuration (database URL, Clerk secret). The "server-only"
// import makes the build fail if a client component imports this module.
// Validation is lazy so `next build` works without runtime secrets.
let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  return (cached ??= parseServerEnv(process.env));
}
