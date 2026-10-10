import { assertDestructiveAllowed, parseDatabaseEnv } from "@signalone/shared";
import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { createEmailSuppressionRepo } from "./email-suppression";
import { emailSuppression } from "./schema";

// Database-backed integration test for the email suppression list (S14, /docs/automation/integration.md). It
// runs ONLY via `pnpm --filter web test:integration`, never in `pnpm test`, and is fail-closed: DATABASE_ENV
// must be explicitly `dev` or `qa`; STAGE and PROD are refused. The migrations must already be applied
// (`pnpm --filter web db:migrate -- --env=dev`).
const config = parseDatabaseEnv(process.env);
assertDestructiveAllowed(config.databaseEnv, ["dev", "qa"], "test:integration");
if (process.env.APP_ENV && process.env.APP_ENV !== config.databaseEnv) {
  throw new Error("test:integration: APP_ENV must equal DATABASE_ENV; refusing.");
}
if (process.env.VERCEL_ENV) throw new Error("test:integration: must not run on Vercel; refusing.");

const db = createDb(config.databaseUrl);
const repo = createEmailSuppressionRepo(db);
const keys = [`itest-s14-${crypto.randomUUID()}`, `itest-s14-${crypto.randomUUID()}`];

afterAll(async () => {
  await db.delete(emailSuppression).where(inArray(emailSuppression.addressKey, keys));
});

describe("email suppression list (real database)", () => {
  it("S14 AC6 a key that was never added is not suppressed; an added key is", async () => {
    expect(await repo.isSuppressed(keys[0])).toBe(false);
    await repo.add(keys[0], "bounce");
    expect(await repo.isSuppressed(keys[0])).toBe(true);
    expect(await repo.isSuppressed(keys[1])).toBe(false);
  });

  it("S14 AC7 adding the same key twice is one entry and keeps the first reason", async () => {
    await repo.add(keys[1], "complaint");
    await repo.add(keys[1], "bounce");
    const rows = await db.select().from(emailSuppression).where(inArray(emailSuppression.addressKey, [keys[1]]));
    expect(rows).toHaveLength(1);
    expect(rows[0].reason).toBe("complaint");
  });
});
