import "server-only";

import { checkDatabaseConnection, getDb } from "../db";
import { createReadyService, type ReadyService } from "./services/ready";

// Composition root (/docs/services.md): the only place that wires `getDb()` to
// data access and data access to services. Keep it lazy so `next build` needs no
// database environment and the first request fails fast if it is invalid.
//
//   let items: ItemService | undefined;
//   export function getItemService(): ItemService {
//     return (items ??= createItemService({ repo: createItemRepo(getDb()) }));
//   }
//
// Add one lazy getter per service as the application grows.

let ready: ReadyService | undefined;

/** Readiness for uptime monitoring (`GET /api/v1/ready`): can this deployment reach its database. */
export function getReadyService(): ReadyService {
  return (ready ??= createReadyService({ ping: () => checkDatabaseConnection(getDb()) }));
}
