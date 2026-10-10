import { EnvValidationError, parseDatabaseEnv, type DatabaseEnvConfig, type EnvSource } from "@signalone/shared";

/** The word a person types into the workflow to confirm they mean to change production. */
export const PROD_MIGRATION_CONFIRMATION = "migrate-production";

/**
 * Fail-closed guard for applying migrations to production (docs/database.md section 12.3, step 6). Local
 * tooling refuses `prod` entirely; the only way in is the manual "Migrate production" GitHub workflow, which
 * a named reviewer must approve. This guard checks the workflow's own conditions again, so the command cannot
 * be pointed at production from a laptop, from a pull request, from another branch, or from Vercel, even if
 * someone copies the connection string. Every condition must hold; the first failures are all reported.
 */
export function resolveProdMigrationTarget(source: EnvSource, requestedEnv: string | undefined): DatabaseEnvConfig {
  const config = parseDatabaseEnv(source);
  const issues: string[] = [];

  if (config.databaseEnv !== "prod") issues.push("db:migrate:prod: DATABASE_ENV must be prod; refusing.");
  if (source.APP_ENV !== undefined && source.APP_ENV !== "" && source.APP_ENV !== "prod") {
    issues.push("db:migrate:prod: APP_ENV, if set, must be prod; refusing.");
  }
  if (source.GITHUB_ACTIONS !== "true") issues.push("db:migrate:prod: only runs inside the GitHub workflow; refusing.");
  if (source.GITHUB_EVENT_NAME !== "workflow_dispatch") issues.push("db:migrate:prod: only runs when started by hand; refusing.");
  if (source.GITHUB_REF !== "refs/heads/main") issues.push("db:migrate:prod: only runs from the main branch; refusing.");
  if (source.PROD_MIGRATION_CONFIRM !== PROD_MIGRATION_CONFIRMATION) {
    issues.push(`db:migrate:prod: the confirmation word was not entered (${PROD_MIGRATION_CONFIRMATION}); refusing.`);
  }
  if (source.VERCEL_ENV !== undefined && source.VERCEL_ENV !== "") issues.push("db:migrate:prod: must not run on Vercel; refusing.");
  if (requestedEnv !== "prod") issues.push("db:migrate:prod: pass the target explicitly with --env=prod; refusing.");

  if (issues.length > 0) throw new EnvValidationError(issues);
  return config;
}
