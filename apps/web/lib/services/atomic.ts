import type { Database } from "../../db/client";
import { withDbErrors } from "../../db/errors";

// Atomic work for services. The `neon-http` driver has no interactive
// transactions (docs/database.md section 18), so atomicity is a batch: the
// data-access layer builds statements, the service decides which to run, and an
// AtomicRunner executes them together in one transaction. Services receive the
// runner as a dependency, so tests can fake it and a future driver with real
// transactions only changes this module.
type BatchItems = Parameters<Database["batch"]>[0];

export type AtomicRunner = (operation: string, statements: BatchItems) => Promise<readonly unknown[]>;

export const createAtomicRunner =
  (db: Pick<Database, "batch">): AtomicRunner =>
  (operation, statements) =>
    withDbErrors(operation, () => db.batch(statements));
