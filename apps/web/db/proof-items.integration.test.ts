import { assertDestructiveAllowed, parseDatabaseEnv } from "@signalone/shared";
import { inArray, eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { proofItemAcceptance } from "../lib/api/proof-items.acceptance-suite";
import { createDb } from "./client";
import { DatabaseError } from "./errors";
import { createProofItemRepo } from "./proof-items";
import { proofItem } from "./schema";

// Database-backed integration tests (/docs/automation/integration.md). They run
// ONLY via `pnpm --filter web test:integration`, never in `pnpm test`, and they
// are fail-closed: DATABASE_ENV must be explicitly `dev` or `qa` with a
// DATABASE_URL, APP_ENV (if set) must match, and Vercel is refused. STAGE and
// PROD are refused by `assertDestructiveAllowed`. The migrations must already
// be applied (`pnpm --filter web db:migrate -- --env=dev`).
const config = parseDatabaseEnv(process.env);
assertDestructiveAllowed(config.databaseEnv, ["dev", "qa"], "test:integration");
if (process.env.APP_ENV && process.env.APP_ENV !== config.databaseEnv) {
  throw new Error("test:integration: APP_ENV must equal DATABASE_ENV; refusing.");
}
if (process.env.VERCEL_ENV) throw new Error("test:integration: must not run on Vercel; refusing.");

const db = createDb(config.databaseUrl);
const repo = createProofItemRepo(db);
const owners = new Set<string>();
const cleanup = async (ids: string[]) => {
  if (ids.length > 0) await db.delete(proofItem).where(inArray(proofItem.ownerId, ids));
};

afterAll(() => cleanup([...owners]));

describe("proof_item repository against the real database", () => {
  const owner = () => {
    const id = `proof_it_repo_${crypto.randomUUID()}`;
    owners.add(id);
    return id;
  };

  it("persists a row and reads it back with defaults applied by the database", async () => {
    const ownerId = owner();
    const row = await repo.insert(ownerId, "persisted");
    expect(row).toMatchObject({ ownerId, label: "persisted" });
    expect(row.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(await repo.findById(row.id)).toEqual(row);
    expect(await repo.listByOwner(ownerId)).toEqual([row]);
    expect(await repo.countByOwner(ownerId)).toBe(1);
  });

  it("the unique (owner, label) constraint surfaces as a sanitized unique_violation", async () => {
    const ownerId = owner();
    await repo.insert(ownerId, "dup");
    const error = await repo.insert(ownerId, "dup").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DatabaseError);
    expect(error).toMatchObject({ kind: "unique_violation", operation: "proofItem.insert" });
    expect((error as Error).message).not.toMatch(/proof_item|dup/);
  });

  it("deleteOwned only removes rows owned by the caller", async () => {
    const [a, b] = [owner(), owner()];
    const row = await repo.insert(a, "x");
    expect(await repo.deleteOwned(row.id, b)).toBe(false);
    expect(await repo.findById(row.id)).not.toBeNull();
    expect(await repo.deleteOwned(row.id, a)).toBe(true);
    expect(await repo.findById(row.id)).toBeNull();
  });
});

// The same acceptance criteria as the default run, now through the real
// service, repo, Drizzle, and the DEV database.
proofItemAcceptance(() => ({ repo, cleanup }));

describe("API write is persisted in the table (not only visible through the API)", () => {
  it("a row created through the API exists in proof_item for the caller", async () => {
    const { proofItemRoutes } = await import("../lib/api/proof-items");
    const { createApiRoute } = await import("../lib/api/handler");
    const { createProofItemService } = await import("../lib/services/proof-items");
    const ownerId = `proof_it_direct_${crypto.randomUUID()}`;
    owners.add(ownerId);
    const routes = proofItemRoutes(createApiRoute({ getUserId: async () => ownerId }), () =>
      createProofItemService({ repo }),
    );
    const res = await routes.POST(
      new Request("http://localhost/api/v1/proof-items", { method: "POST", body: JSON.stringify({ label: " direct " }) }),
    );
    expect(res.status).toBe(200);
    const rows = await db.select().from(proofItem).where(eq(proofItem.ownerId, ownerId));
    expect(rows.map((r) => r.label)).toEqual(["direct"]);
  });
});
