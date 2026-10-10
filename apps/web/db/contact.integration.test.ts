import { assertDestructiveAllowed, parseDatabaseEnv } from "@signalone/shared";
import { like } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createDb } from "./client";
import { createContactRepo } from "./contact";
import { contactMessage } from "./schema";

// Database-backed integration test for the contact messages (S15, /docs/automation/integration.md). It runs
// ONLY via `pnpm --filter web test:integration`, never in `pnpm test`, and is fail-closed: DATABASE_ENV must
// be explicitly `dev` or `qa`; STAGE and PROD are refused. The migrations must already be applied
// (`pnpm --filter web db:migrate -- --env=dev`).
const config = parseDatabaseEnv(process.env);
assertDestructiveAllowed(config.databaseEnv, ["dev", "qa"], "test:integration");
if (process.env.APP_ENV && process.env.APP_ENV !== config.databaseEnv) {
  throw new Error("test:integration: APP_ENV must equal DATABASE_ENV; refusing.");
}
if (process.env.VERCEL_ENV) throw new Error("test:integration: must not run on Vercel; refusing.");

const db = createDb(config.databaseUrl);
const repo = createContactRepo(db);
const PREFIX = "itest-s15-";
const key = `${PREFIX}${crypto.randomUUID()}`;
const message = (name: string, addressKey = key) => ({ topic: "question", name: `${PREFIX}${name}`, replyEmail: null, message: "A message long enough to store.", addressKey });
const ours = async () => (await repo.list("all")).filter((m) => m.name.startsWith(PREFIX));

afterAll(async () => {
  await db.delete(contactMessage).where(like(contactMessage.name, `${PREFIX}%`));
});

describe("contact messages (real database)", () => {
  it("S15 AC8 stores up to the daily limit per address key and refuses the next, counted in the database", async () => {
    const since = new Date(Date.now() - 24 * 3600 * 1000);
    expect(await repo.createLimited(message("one"), 2, since)).toBe(true);
    expect(await repo.createLimited(message("two"), 2, since)).toBe(true);
    expect(await repo.createLimited(message("three"), 2, since)).toBe(false);
    expect((await ours()).map((m) => m.name).sort()).toEqual([`${PREFIX}one`, `${PREFIX}two`]);
    expect(await repo.createLimited(message("other", `${key}-other`), 2, since)).toBe(true); // another address is not limited
    expect(await repo.createLimited(message("later"), 2, new Date(Date.now() + 1000))).toBe(true); // messages older than the window do not count
  });

  it("S15 AC9 lists newest first, filters by status, marks done and deletes", async () => {
    const all = await ours();
    expect(all.map((m) => m.createdAt.getTime())).toEqual([...all.map((m) => m.createdAt.getTime())].sort((a, b) => b - a));
    const first = all[0];
    const done = await repo.setStatus(first.id, "done");
    expect(done?.status).toBe("done");
    expect((await repo.list("done")).some((m) => m.id === first.id)).toBe(true);
    expect((await repo.list("new")).some((m) => m.id === first.id)).toBe(false);
    expect(await repo.setStatus(crypto.randomUUID(), "done")).toBeNull();
    expect(await repo.remove(first.id)).toBe(true);
    expect(await repo.remove(first.id)).toBe(false);
    expect((await ours()).some((m) => m.id === first.id)).toBe(false);
  });
});
