// Test-only helpers. Exposed as `@signalone/shared/testing`, deliberately NOT
// re-exported from the package index so production bundles never import it.
// All values are fake; never put real credentials here.
import type { EnvSource } from "../env";

/** Variables a unit test must never inherit from the developer's shell. */
export const ISOLATED_ENV_NAMES = [
  "APP_ENV",
  "DATABASE_ENV",
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "VERCEL_ENV",
] as const;

/** Deletes environment-identity and credential variables from `process.env`. */
type MutableEnv = Record<string, string | undefined>;

// `shared` is runtime-agnostic and has no Node typings, so reach process.env via globalThis.
export const processEnv = (): MutableEnv =>
  (globalThis as unknown as { process: { env: MutableEnv } }).process.env;

export function clearIsolatedEnv(target: MutableEnv = processEnv()): void {
  for (const name of ISOLATED_ENV_NAMES) delete target[name];
}

/**
 * A complete, valid, fake `dev` server env source (unit tests only; the URL is
 * unroutable and the keys are placeholders). Override fields per test.
 */
export function fakeServerEnv(overrides: EnvSource = {}): EnvSource {
  return {
    DATABASE_ENV: "dev",
    DATABASE_URL: "postgresql://test:fake-password@db.invalid/test",
    CLERK_SECRET_KEY: "sk_test_fake",
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_fake",
    ...overrides,
  };
}
