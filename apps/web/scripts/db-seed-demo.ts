// Adds sample churches and events to the dev/qa database named by --env, for demonstrations. Usage:
//   pnpm --filter web db:seed:demo --env=dev
// The same safety rules as db:seed apply: dev and qa only, production is refused. Everything it adds is marked
// as sample data, and it records itself in the seed ledger, so running it again changes nothing.
import { DEMO_SEEDS } from "../db/demo-seed";
import { runTooling } from "../db/tooling/cli";
import { runSeeds } from "../db/tooling/seed";

void runTooling("db:seed", async (exec) => {
  const applied = await runSeeds(exec, DEMO_SEEDS);
  console.log(applied.length > 0 ? `db:seed:demo: applied [${applied.join(", ")}].` : "db:seed:demo: already applied; nothing changed.");
});
