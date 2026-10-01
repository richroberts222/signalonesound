import {
  assertDestructiveAllowed,
  EnvValidationError,
  parseDatabaseEnv,
  type AppEnv,
  type DatabaseEnvConfig,
  type EnvSource,
} from "@signalone/shared";

/** Environments reset/seed may ever target. stage and prod are never allowed. */
export const RESET_SEED_ALLOWED_ENVS: readonly AppEnv[] = ["dev", "qa"];

export type ToolingOperation = "db:reset" | "db:seed" | "db:refresh";

/**
 * Fail-closed guard for reset/seed tooling. Safety comes only from explicit
 * configuration (never from DATABASE_URL contents, see /docs/database.md):
 *
 * 1. DATABASE_ENV/DATABASE_URL must validate (shared `parseDatabaseEnv`).
 * 2. APP_ENV, if set, must equal DATABASE_ENV.
 * 3. Tooling never runs on Vercel (VERCEL_ENV must be unset).
 * 4. The target must be in the dev/qa allow-list (`assertDestructiveAllowed`,
 *    which also refuses prod and unknown targets).
 * 5. The operator must pass the target explicitly (`--env=<name>`) and it must
 *    match DATABASE_ENV, so the intended target is always stated.
 */
export function resolveToolingTarget(
  source: EnvSource,
  operation: ToolingOperation,
  requestedEnv: string | undefined,
): DatabaseEnvConfig {
  const config = parseDatabaseEnv(source);
  const issues: string[] = [];

  const appEnv = source.APP_ENV;
  if (appEnv !== undefined && appEnv !== "" && appEnv !== config.databaseEnv) {
    issues.push(`${operation}: APP_ENV must equal DATABASE_ENV (${config.databaseEnv}); refusing.`);
  }
  if (source.VERCEL_ENV !== undefined && source.VERCEL_ENV !== "") {
    issues.push(`${operation}: must not run on Vercel (VERCEL_ENV is set); refusing.`);
  }
  if (issues.length > 0) throw new EnvValidationError(issues);

  assertDestructiveAllowed(config.databaseEnv, RESET_SEED_ALLOWED_ENVS, operation);

  if (!requestedEnv) {
    throw new EnvValidationError([
      `${operation}: pass the target explicitly with --env=<${RESET_SEED_ALLOWED_ENVS.join("|")}>; refusing.`,
    ]);
  }
  if (requestedEnv !== config.databaseEnv) {
    throw new EnvValidationError([`${operation}: --env does not match DATABASE_ENV; refusing.`]);
  }
  return config;
}

/** Extracts `--env=<value>` from argv; no other flags are accepted. */
export function parseEnvFlag(argv: readonly string[]): string | undefined {
  let value: string | undefined;
  for (const arg of argv) {
    if (arg === "--") continue;
    if (arg.startsWith("--env=")) value = arg.slice("--env=".length);
    else throw new EnvValidationError([`Unknown argument '${arg}'.`]);
  }
  return value;
}
