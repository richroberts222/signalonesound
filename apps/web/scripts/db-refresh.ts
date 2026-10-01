// Reset then seed (known state) on dev/qa. Usage:
//   pnpm --filter web db:refresh --env=dev
import { runTooling } from "../db/tooling/cli";
import { resetData } from "../db/tooling/reset";
import { runSeeds } from "../db/tooling/seed";

void runTooling("db:refresh", async (exec) => {
  const tables = await resetData(exec);
  const applied = await runSeeds(exec);
  console.log(`db:refresh: truncated ${tables.length} table(s); applied [${applied.join(", ")}].`);
});
