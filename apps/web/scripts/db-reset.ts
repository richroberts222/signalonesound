// Truncates all data in the dev/qa database named by --env. Usage:
//   pnpm --filter web db:reset --env=dev
import { runTooling } from "../db/tooling/cli";
import { resetData } from "../db/tooling/reset";

void runTooling("db:reset", async (exec) => {
  const tables = await resetData(exec);
  console.log(`db:reset: truncated ${tables.length} table(s).`);
});
