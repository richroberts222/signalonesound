import "server-only";

// Composition root (/docs/services.md): the only place that wires `getDb()` to
// data access and data access to services. Keep it lazy so `next build` needs no
// database environment and the first request fails fast if it is invalid.
//
//   import { getDb } from "../db";
//   let items: ItemService | undefined;
//   export function getItemService(): ItemService {
//     return (items ??= createItemService({ repo: createItemRepo(getDb()) }));
//   }
//
// Add one lazy getter per service as the application grows.
export {};
