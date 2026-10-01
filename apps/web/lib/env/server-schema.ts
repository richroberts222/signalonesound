// Validation of server-only configuration. Pure (reads process.env only as a
// default argument) so it can be tested and used by tooling. Application code
// must import from "@/lib/env/server", which adds the server-only guard.
import {
  EnvError,
  isProd,
  resolveAppEnv,
  type AppEnv,
  type EnvSource,
} from "./app-env";

export type DatabaseEnv = {
  appEnv: AppEnv;
  databaseUrl: string;
};

export type ServerEnv = DatabaseEnv & {
  clerkSecretKey: string;
};

function required(source: EnvSource, name: string): string {
  const value = source[name];
  if (!value) throw new EnvError(`${name} is not set.`);
  return value;
}

// Database tooling (drizzle-kit, db:check) needs only these two values.
export function parseDatabaseEnv(source: EnvSource = process.env): DatabaseEnv {
  const appEnv = resolveAppEnv(source);
  const databaseUrl = required(source, "DATABASE_URL");
  let protocol: string;
  try {
    protocol = new URL(databaseUrl).protocol;
  } catch {
    // Never echo the value: it contains credentials.
    throw new EnvError("DATABASE_URL is not a valid URL.");
  }
  if (protocol !== "postgres:" && protocol !== "postgresql:") {
    throw new EnvError(
      "DATABASE_URL must be a postgres:// or postgresql:// URL.",
    );
  }
  return { appEnv, databaseUrl };
}

export function parseServerEnv(source: EnvSource = process.env): ServerEnv {
  const database = parseDatabaseEnv(source);
  const clerkSecretKey = required(source, "CLERK_SECRET_KEY");

  // Live Clerk credentials must not be used outside prod.
  if (!isProd(database.appEnv) && clerkSecretKey.startsWith("sk_live_")) {
    throw new EnvError(
      `A live Clerk secret key is not allowed with APP_ENV=${database.appEnv}.`,
    );
  }
  return { ...database, clerkSecretKey };
}
