// Removes the contact messages the browser tests created in the dev/qa database named by --env. Usage:
//   pnpm --filter web db:cleanup:e2e --env=dev
// The same safety rules as db:seed apply: dev and qa only, production is refused. It deletes only rows whose name
// starts with the browser tests' prefix (see db/tooling/e2e-cleanup.ts).
import { E2E_CLEANUP_STATEMENTS } from "../db/tooling/e2e-cleanup";
import { runTooling } from "../db/tooling/cli";

void runTooling("db:seed", async (exec) => {
  await exec.transaction(E2E_CLEANUP_STATEMENTS);
  console.log("db:cleanup:e2e: removed the browser tests' messages.");
});
