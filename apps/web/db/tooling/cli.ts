import { config } from "dotenv";
import { EnvValidationError } from "@signalone/shared";

import { createNeonExecutor, type SqlExecutor } from "./executor";
import { parseEnvFlag, resolveToolingTarget, type ToolingOperation } from "./guard";

/** Shared entry point for reset/seed scripts: guard first, then run. */
export async function runTooling(
  operation: ToolingOperation,
  action: (exec: SqlExecutor, env: string) => Promise<void>,
): Promise<void> {
  try {
    config({ path: ".env.local" });
    const target = resolveToolingTarget(process.env, operation, parseEnvFlag(process.argv.slice(2)));
    console.log(`${operation}: target=${target.databaseEnv}`);
    await action(createNeonExecutor(target.databaseUrl), target.databaseEnv);
  } catch (error) {
    // Never echo connection strings; report only the message.
    console.error(
      error instanceof EnvValidationError
        ? error.message
        : `${operation} failed: ${error instanceof Error ? error.message : "unknown error"}`,
    );
    process.exit(1);
  }
}
