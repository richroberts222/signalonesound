export const DATABASE_ENVS = ["dev", "qa", "stage", "prod"] as const;

export type DatabaseEnv = (typeof DATABASE_ENVS)[number];

// Environment selection is explicit configuration; it is never inferred from
// the DATABASE_URL hostname (see /docs/database.md section 2).
export function getDatabaseEnv(): DatabaseEnv {
  const value = process.env.DATABASE_ENV;
  if (!DATABASE_ENVS.includes(value as DatabaseEnv)) {
    throw new Error(
      "DATABASE_ENV must be one of " + DATABASE_ENVS.join(", ") + ".",
    );
  }
  return value as DatabaseEnv;
}
