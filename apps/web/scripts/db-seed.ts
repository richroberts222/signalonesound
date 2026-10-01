// Applies generic seeds to the dev/qa database named by --env. Usage:
//   pnpm --filter web db:seed --env=dev
import { runTooling } from "../db/tooling/cli";
import { runSeeds } from "../db/tooling/seed";

void runTooling("db:seed", async (exec) => {
  const applied = await runSeeds(exec);
  console.log(`db:seed: applied [${applied.join(", ")}].`);
});
