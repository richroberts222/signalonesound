import "server-only";

import {
  parseDatabaseEnv,
  parseServerEnv,
  type DatabaseEnv,
  type ServerEnv,
} from "./server-schema";

// Server-only configuration. The "server-only" import makes the build fail if
// this module (or anything importing it) reaches a client component.
let server: ServerEnv | undefined;
let database: DatabaseEnv | undefined;

export function getServerEnv(): ServerEnv {
  return (server ??= parseServerEnv(process.env));
}

export function getDatabaseEnv(): DatabaseEnv {
  return (database ??= parseDatabaseEnv(process.env));
}

export * from "./app-env";
