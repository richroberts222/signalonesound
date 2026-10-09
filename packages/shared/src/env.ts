// Pure environment/configuration logic. This module never reads `process.env`
// itself: callers pass in a plain record, so it runs unchanged in Node, the
// browser, and React Native/Expo. See /docs/environment.md.
import { APP_ENVS, type AppEnv } from "./constants";

/** Environments that tooling and tests are never allowed to mutate. */
export const PROTECTED_APP_ENVS: readonly AppEnv[] = ["prod"];

export type EnvSource = Readonly<Record<string, string | undefined>>;

/** Thrown for every configuration problem; messages never contain values. */
export class EnvValidationError extends Error {
  readonly issues: readonly string[];
  constructor(issues: readonly string[]) {
    super("Invalid environment configuration:\n- " + issues.join("\n- "));
    this.name = "EnvValidationError";
    this.issues = issues;
  }
}

export function isAppEnv(value: unknown): value is AppEnv {
  return typeof value === "string" && (APP_ENVS as readonly string[]).includes(value);
}

export function isProd(env: AppEnv): boolean {
  return env === "prod";
}

/** Values are reported by name only, never echoed, since they may be secrets. */
function readEnum(source: EnvSource, name: string, issues: string[]): AppEnv | undefined {
  const value = source[name];
  if (value === undefined || value === "") {
    issues.push(`${name} is not set (expected one of ${APP_ENVS.join(", ")}).`);
    return undefined;
  }
  if (!isAppEnv(value)) {
    issues.push(`${name} is invalid (expected exactly one of ${APP_ENVS.join(", ")}).`);
    return undefined;
  }
  return value;
}

function readRequired(source: EnvSource, name: string, issues: string[]): string {
  const value = source[name];
  if (value === undefined || value.trim() === "") {
    issues.push(`${name} is not set.`);
    return "";
  }
  return value;
}

/** Never echoes the value: connection strings contain credentials. */
function readDatabaseUrl(source: EnvSource, issues: string[]): string {
  const value = readRequired(source, "DATABASE_URL", issues);
  if (value === "") return value;
  // Regex rather than `new URL`: this module avoids runtime/DOM-specific globals.
  const match = /^([a-z][a-z0-9+.-]*):\/\/\S+$/i.exec(value);
  if (!match) {
    issues.push("DATABASE_URL is not a valid URL.");
    return "";
  }
  const protocol = match[1].toLowerCase();
  if (protocol !== "postgres" && protocol !== "postgresql") {
    issues.push("DATABASE_URL must use the postgres: or postgresql: protocol.");
    return "";
  }
  return value;
}

export type DatabaseEnvConfig = {
  /** Logical environment that `databaseUrl` points at. */
  databaseEnv: AppEnv;
  /** SERVER ONLY. */
  databaseUrl: string;
};

/**
 * Minimal configuration for database tooling (db:check, drizzle-kit, future
 * reset/seed): needs no Clerk keys.
 */
export function parseDatabaseEnv(source: EnvSource): DatabaseEnvConfig {
  const issues: string[] = [];
  const databaseEnv = readEnum(source, "DATABASE_ENV", issues);
  const databaseUrl = readDatabaseUrl(source, issues);
  if (issues.length > 0 || !databaseEnv) throw new EnvValidationError(issues);
  return { databaseEnv, databaseUrl };
}

export type ServerEnv = {
  /** Logical environment of the running application. */
  appEnv: AppEnv;
  /** Logical environment that `databaseUrl` points at. */
  databaseEnv: AppEnv;
  /** SERVER ONLY. */
  databaseUrl: string;
  /** SERVER ONLY. */
  clerkSecretKey: string;
  clerkPublishableKey: string;
  /** Clerk user ids of the platform admins (ADMIN_USER_IDS, comma separated). Empty means nobody. */
  adminUserIds: string[];
  /** Secret the platform scheduler sends to the job endpoints (CRON_SECRET). Null means jobs refuse every call. */
  cronSecret: string | null;
  /** Key for hashing the network address on public forms (RATE_LIMIT_SALT). Null means a per-process random key is used. */
  rateLimitSalt: string | null;
};

/** Reads ADMIN_USER_IDS: a comma-separated list of Clerk user ids. A malformed entry is reported. */
export function parseAdminUserIds(source: EnvSource, issues: string[]): string[] {
  const raw = source.ADMIN_USER_IDS;
  if (raw === undefined || raw.trim() === "") return [];
  const ids = raw.split(",").map((id) => id.trim()).filter((id) => id !== "");
  if (ids.some((id) => !/^user_[A-Za-z0-9]{8,64}$/.test(id))) {
    issues.push("ADMIN_USER_IDS must be a comma-separated list of Clerk user ids (user_...).");
    return [];
  }
  return [...new Set(ids)];
}

/**
 * Validate server-side configuration. Every problem is collected and reported
 * together. APP_ENV is optional for backward compatibility and defaults to the
 * explicit DATABASE_ENV; it is never inferred from hostnames.
 */
export function parseServerEnv(source: EnvSource): ServerEnv {
  const issues: string[] = [];
  const databaseEnv = readEnum(source, "DATABASE_ENV", issues);
  const rawApp = source.APP_ENV;
  const appEnv = rawApp === undefined || rawApp === "" ? databaseEnv : readEnum(source, "APP_ENV", issues);
  const databaseUrl = readDatabaseUrl(source, issues);
  const clerkSecretKey = readRequired(source, "CLERK_SECRET_KEY", issues);
  const clerkPublishableKey = readRequired(source, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", issues);
  const adminUserIds = parseAdminUserIds(source, issues);
  const cronSecret = source.CRON_SECRET && source.CRON_SECRET.trim() !== "" ? source.CRON_SECRET : null;
  if (cronSecret !== null && cronSecret.length < 16) issues.push("CRON_SECRET must be at least 16 characters.");
  const rateLimitSalt = source.RATE_LIMIT_SALT && source.RATE_LIMIT_SALT.trim() !== "" ? source.RATE_LIMIT_SALT : null;
  if (rateLimitSalt !== null && rateLimitSalt.length < 16) issues.push("RATE_LIMIT_SALT must be at least 16 characters.");

  if (appEnv && databaseEnv) {
    // A prod app must use the prod database and nothing else may touch it.
    if ((appEnv === "prod") !== (databaseEnv === "prod")) {
      issues.push("APP_ENV and DATABASE_ENV must both be 'prod' or both be non-prod.");
    }
  }
  // prod is only valid on a real Vercel production deployment. VERCEL_ENV is
  // unset locally and in CI, and "development" only for `vercel dev`.
  const vercelEnv = source.VERCEL_ENV;
  if (vercelEnv !== undefined && vercelEnv !== "" && vercelEnv !== "production") {
    if (appEnv === "prod" || databaseEnv === "prod") {
      issues.push("Vercel Preview and development deployments must not use the prod environment or database (prod is only allowed on a Vercel production deployment).");
    }
  }
  // Preview maps to qa (stage is the protected pre-production environment).
  if (vercelEnv === "preview" && ((appEnv && appEnv !== "qa") || (databaseEnv && databaseEnv !== "qa"))) {
    issues.push("Vercel Preview deployments must use qa for both APP_ENV and DATABASE_ENV (not dev, stage, or prod).");
  }
  // Live Clerk keys belong to prod only.
  if (appEnv && appEnv !== "prod" && clerkSecretKey.startsWith("sk_live_")) {
    issues.push("A live Clerk secret key is not allowed outside the prod environment.");
  }

  if (issues.length > 0 || !appEnv || !databaseEnv) throw new EnvValidationError(issues);
  return { appEnv, databaseEnv, databaseUrl, clerkSecretKey, clerkPublishableKey, adminUserIds, cronSecret, rateLimitSalt };
}

export type ClientEnv = {
  clerkPublishableKey: string;
  /** Optional display/diagnostic hint; not authoritative. */
  appEnv: AppEnv | undefined;
};

/**
 * Validate values safe for browsers/mobile. Accepts only client-safe names
 * (callers pass explicit literal reads, e.g. `process.env.NEXT_PUBLIC_X`, since
 * bundlers inline only literal accesses). Mobile maps `EXPO_PUBLIC_*` names
 * onto the same shape.
 */
export function parseClientEnv(source: EnvSource): ClientEnv {
  const issues: string[] = [];
  const clerkPublishableKey = readRequired(source, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", issues);
  let appEnv: AppEnv | undefined;
  const rawApp = source.NEXT_PUBLIC_APP_ENV;
  if (rawApp !== undefined && rawApp !== "") appEnv = readEnum(source, "NEXT_PUBLIC_APP_ENV", issues);
  if (issues.length > 0) throw new EnvValidationError(issues);
  return { clerkPublishableKey, appEnv };
}

export type MobileClientEnv = {
  /** Environment of the build profile; explicit, never inferred. */
  appEnv: AppEnv;
  /** Base URL of the Signal One API, without a trailing slash. */
  apiBaseUrl: string;
  /** Optional until the Clerk mobile integration is added. */
  clerkPublishableKey: string | undefined;
};

/**
 * Validate values safe for the Expo app bundle (public). Callers pass explicit
 * literal `process.env.EXPO_PUBLIC_*` reads, since Expo inlines only literal
 * accesses. Never accepts database or Clerk secret values.
 */
export function parseMobileClientEnv(source: EnvSource): MobileClientEnv {
  const issues: string[] = [];
  const appEnv = readEnum(source, "EXPO_PUBLIC_APP_ENV", issues);

  let apiBaseUrl = "";
  const rawUrl = source.EXPO_PUBLIC_API_BASE_URL;
  if (rawUrl === undefined || rawUrl.trim() === "") {
    issues.push("EXPO_PUBLIC_API_BASE_URL is not set.");
  } else {
    // Regex rather than `new URL`: React Native's URL support is partial.
    const match = /^(https?):\/\/[^\s/?#]+(\/[^\s?#]*)?$/i.exec(rawUrl.trim());
    if (!match) {
      issues.push("EXPO_PUBLIC_API_BASE_URL must be an http(s) URL without query or fragment.");
    } else if (match[1].toLowerCase() === "http" && appEnv !== undefined && appEnv !== "dev") {
      issues.push("EXPO_PUBLIC_API_BASE_URL must use https outside the dev environment.");
    } else {
      apiBaseUrl = rawUrl.trim().replace(/\/+$/, "");
    }
  }

  let clerkPublishableKey: string | undefined;
  const rawKey = source.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (rawKey !== undefined && rawKey.trim() !== "") {
    if (!rawKey.startsWith("pk_")) {
      issues.push("EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY must be a publishable key (pk_...).");
    } else if (appEnv !== undefined && appEnv !== "prod" && rawKey.startsWith("pk_live_")) {
      issues.push("A live Clerk publishable key is not allowed outside the prod environment.");
    } else {
      clerkPublishableKey = rawKey;
    }
  }

  if (issues.length > 0 || !appEnv) throw new EnvValidationError(issues);
  return { appEnv, apiBaseUrl, clerkPublishableKey };
}

/**
 * Guard for destructive tooling (reset, seed, bulk test data). Fails closed:
 * the target must be explicitly allowed, and protected environments are
 * refused even if a caller lists them.
 */
export function assertDestructiveAllowed(
  target: AppEnv | undefined,
  allowed: readonly AppEnv[],
  operation: string,
): asserts target is AppEnv {
  if (!target) throw new EnvValidationError([`${operation}: target environment is unknown; refusing.`]);
  if (PROTECTED_APP_ENVS.includes(target)) {
    throw new EnvValidationError([`${operation}: refusing to run against protected environment '${target}'.`]);
  }
  if (!allowed.includes(target)) {
    throw new EnvValidationError([`${operation}: environment '${target}' is not in the allowed set (${allowed.join(", ")}).`]);
  }
}

/** Guard for non-destructive tooling that must never target prod. */
export function assertNotProd(target: AppEnv | undefined, operation: string): asserts target is AppEnv {
  if (!target) throw new EnvValidationError([`${operation}: target environment is unknown; refusing.`]);
  if (isProd(target)) {
    throw new EnvValidationError([`${operation}: refusing to run against '${target}'.`]);
  }
}

/** Names that must never be exposed to browser/mobile bundles. */
export function isClientExposedName(name: string): boolean {
  return name.startsWith("NEXT_PUBLIC_") || name.startsWith("EXPO_PUBLIC_");
}
