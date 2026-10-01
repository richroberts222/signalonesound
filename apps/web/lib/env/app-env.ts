// Application environment identity. Pure and dependency-free so it is safe to
// import from server code, client code, tooling, and tests.
// Environment selection is explicit configuration; it is never inferred from a
// DATABASE_URL hostname (see /docs/database.md section 2).

import { APP_ENVS, type AppEnv } from "@signalone/shared";

// The list of environments is defined once, in @signalone/shared, so Web and
// the future mobile app agree on it.
export { APP_ENVS, type AppEnv };

// Environments in which destructive tooling (reset, seed, bulk test data) may
// ever run. Allow-list, so unknown or future environments fail closed.
export const DESTRUCTIVE_ALLOWED_ENVS: readonly AppEnv[] = ["dev", "qa"];

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvError";
  }
}

export type EnvSource = Record<string, string | undefined>;

export function isAppEnv(value: unknown): value is AppEnv {
  return APP_ENVS.includes(value as AppEnv);
}

// APP_ENV is canonical. DATABASE_ENV is the legacy name from the original
// database setup and is accepted when APP_ENV is unset. If both are set they
// must agree, so a misconfiguration cannot point code at the wrong target.
export function resolveAppEnv(source: EnvSource = process.env): AppEnv {
  const appEnv = source.APP_ENV || undefined;
  const legacy = source.DATABASE_ENV || undefined;
  const value = appEnv ?? legacy;

  if (!isAppEnv(value)) {
    throw new EnvError(
      `APP_ENV must be one of ${APP_ENVS.join(", ")} (received ${
        value === undefined ? "nothing" : JSON.stringify(value)
      }).`,
    );
  }
  if (legacy !== undefined && legacy !== value) {
    throw new EnvError(
      `APP_ENV (${value}) and DATABASE_ENV (${legacy}) disagree. Set only APP_ENV, or make them identical.`,
    );
  }

  // Vercel Preview/Development deployments must never run as prod.
  const vercelEnv = source.VERCEL_ENV;
  if (value === "prod" && vercelEnv && vercelEnv !== "production") {
    throw new EnvError(
      `APP_ENV=prod is not allowed on a Vercel ${vercelEnv} deployment.`,
    );
  }
  return value;
}

export function isProd(env: AppEnv): boolean {
  return env === "prod";
}

// Throws unless env is positively identified as an environment where
// destructive operations are permitted. Use in all reset/seed tooling.
export function assertDestructiveAllowed(env: AppEnv, operation: string): void {
  if (!DESTRUCTIVE_ALLOWED_ENVS.includes(env)) {
    throw new EnvError(
      `Refusing to ${operation} against APP_ENV=${env}. Allowed: ${DESTRUCTIVE_ALLOWED_ENVS.join(", ")}.`,
    );
  }
}

// Throws for prod only. For local tooling that is not destructive but must
// still never touch production (e.g. drizzle-kit).
export function assertNotProd(env: AppEnv, operation: string): void {
  if (isProd(env)) {
    throw new EnvError(`Refusing to ${operation} against APP_ENV=prod.`);
  }
}
