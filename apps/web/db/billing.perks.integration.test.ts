import { assertDestructiveAllowed, parseDatabaseEnv } from "@signalone/shared";
import { eq, inArray, like } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createBillingRepo } from "./billing";
import { createDb } from "./client";
import { auditLog, billingPerk, billingPlan, billingPlanPerk, billingPrice } from "./schema";

// Database-backed integration tests for plan perks (S20, /docs/automation/integration.md). They run ONLY via
// `pnpm --filter web test:integration`, never in `pnpm test`, and are fail-closed: DATABASE_ENV must be
// explicitly `dev` or `qa`. The migrations must already be applied. They prove the real SQL does what the
// in-memory fake the acceptance tests use does: a unique key, a replace-all list saved with its audit entry,
// and only ACTIVE perks listed.
const config = parseDatabaseEnv(process.env);
assertDestructiveAllowed(config.databaseEnv, ["dev", "qa"], "test:integration");
if (process.env.APP_ENV && process.env.APP_ENV !== config.databaseEnv) {
  throw new Error("test:integration: APP_ENV must equal DATABASE_ENV; refusing.");
}
if (process.env.VERCEL_ENV) throw new Error("test:integration: must not run on Vercel; refusing.");

const db = createDb(config.databaseUrl);
const repo = createBillingRepo(db);
const PREFIX = "itest_s20_";
const admin = `user_${PREFIX}admin`;
const planIds: string[] = [];

afterAll(async () => {
  if (planIds.length > 0) {
    await db.delete(billingPlanPerk).where(inArray(billingPlanPerk.planId, planIds));
    await db.delete(billingPrice).where(inArray(billingPrice.planId, planIds));
    await db.delete(billingPlan).where(inArray(billingPlan.id, planIds));
  }
  await db.delete(billingPerk).where(like(billingPerk.key, `${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.actorId, `%${PREFIX}%`));
});

const newPlan = async () => {
  const plan = await repo.createPlan({ accountType: "member", name: `${PREFIX}plan`, price: { interval: "month", amountMinor: 300, currency: "usd" } }, admin);
  planIds.push(plan.id);
  return plan.id;
};

describe("plan perks (real database)", () => {
  it("S20 AC2 a perk is saved with its audit entry, and a duplicate key is refused", async () => {
    const perk = await repo.createPerk({ key: `${PREFIX}ad_free`, label: "No ads", description: "", accountType: "member" }, admin);
    expect(perk).toMatchObject({ key: `${PREFIX}ad_free`, active: true });
    expect((await repo.listPerks()).some((p) => p.id === perk.id)).toBe(true);
    const entry = (await repo.listAudit(200)).find((e) => e.actorId === admin && e.action === "billing.perk.create" && e.subject === `perk:${PREFIX}ad_free`);
    expect(entry).toBeDefined();
    await expect(repo.createPerk({ key: `${PREFIX}ad_free`, label: "Again", description: "", accountType: "member" }, admin)).rejects.toMatchObject({ kind: "unique_violation" });
  });

  it("S20 AC2 the database refuses a badly shaped key even if the app did not", async () => {
    await expect(db.insert(billingPerk).values({ key: "Bad Key", label: "x", accountType: "member" })).rejects.toBeDefined();
  });

  it("S20 AC3 AC4 AC5 a plan's perks are replaced in one step, with one audit entry, and only active perks are listed", async () => {
    const plan = await newPlan();
    const a = await repo.createPerk({ key: `${PREFIX}a`, label: "A", description: "first", accountType: "member" }, admin);
    const b = await repo.createPerk({ key: `${PREFIX}b`, label: "B", description: "", accountType: "member" }, admin);
    await repo.setPlanPerks(plan, [a.id, b.id], admin);
    expect((await repo.listPlanPerkIds()).find((p) => p.planId === plan)?.perkIds.sort()).toEqual([a.id, b.id].sort());

    await repo.setPlanPerks(plan, [b.id], admin); // replaced, not added to
    expect((await repo.listPlanPerkIds()).find((p) => p.planId === plan)?.perkIds).toEqual([b.id]);

    await repo.setPlanPerks(plan, [a.id, b.id], admin);
    await repo.updatePerk(b.id, { active: false }, admin, b);
    const listed = (await repo.listActivePlanPerks()).filter((p) => p.planId === plan);
    expect(listed).toEqual([{ planId: plan, key: `${PREFIX}a`, label: "A", description: "first" }]); // the switched-off perk is not listed
    expect((await repo.listActivePerksOfType("member")).some((p) => p.id === b.id)).toBe(false);

    await repo.setPlanPerks(plan, [], admin);
    expect((await repo.listPlanPerkIds()).find((p) => p.planId === plan)).toBeUndefined();
    const audits = (await repo.listAudit(200)).filter((e) => e.actorId === admin && e.action === "billing.plan.perks" && e.subject === `plan:${plan}`);
    expect(audits).toHaveLength(4);
  });

  it("S20 AC3 changing a perk keeps its key and writes an audit entry", async () => {
    const perk = await repo.createPerk({ key: `${PREFIX}c`, label: "C", description: "", accountType: "organization" }, admin);
    const changed = await repo.updatePerk(perk.id, { label: "See", description: "words" }, admin, perk);
    expect(changed).toMatchObject({ key: `${PREFIX}c`, accountType: "organization", label: "See", description: "words" });
    expect((await db.select().from(billingPerk).where(eq(billingPerk.id, perk.id)))[0].label).toBe("See");
    expect((await repo.listAudit(200)).some((e) => e.action === "billing.perk.update" && e.subject === `perk:${PREFIX}c`)).toBe(true);
  });
});
