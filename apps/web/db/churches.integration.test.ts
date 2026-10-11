import { assertDestructiveAllowed, parseDatabaseEnv } from "@signalone/shared";
import { inArray, like } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

import { createChurchesRepo, type ChurchSearch } from "./churches";
import { createDb } from "./client";
import { auditLog, churchProfile, churchService, organization } from "./schema";

// Database-backed integration tests for churches (S18, /docs/automation/integration.md). They run ONLY via
// `pnpm --filter web test:integration`, never in `pnpm test`, and are fail-closed: DATABASE_ENV must be explicitly `dev`
// or `qa`; STAGE and PROD are refused. The migrations must already be applied (`pnpm --filter web db:migrate -- --env=dev`).
const config = parseDatabaseEnv(process.env);
assertDestructiveAllowed(config.databaseEnv, ["dev", "qa"], "test:integration");
if (process.env.APP_ENV && process.env.APP_ENV !== config.databaseEnv) throw new Error("test:integration: APP_ENV must equal DATABASE_ENV; refusing.");
if (process.env.VERCEL_ENV) throw new Error("test:integration: must not run on Vercel; refusing.");

const db = createDb(config.databaseUrl);
const repo = createChurchesRepo(db);
const PREFIX = "itest-s18-";
const orgs = new Set<string>();

const newChurch = async (name: string, status: "approved" | "pending" = "approved") => {
  const id = crypto.randomUUID();
  orgs.add(id);
  await db.insert(organization).values({ id, name: `${PREFIX}${name}`, nameKey: `${PREFIX}${id}`, status });
  return id;
};
const profile = (orgId: string, over: Partial<{ city: string; lat: number | null; lng: number | null; country: string; state: string }> = {}) => ({
  orgId,
  street: "1 Main St",
  city: "Springfield",
  state: "MO",
  zip: "65801",
  country: "US",
  lat: 37.2 as number | null,
  lng: -93.3 as number | null,
  timeZone: "America/Chicago",
  ...over,
});
const audit = (orgId: string, action: string) => ({ actorId: `user_${PREFIX}x`, action, subject: `organization:${orgId}` });
const search = (over: Partial<ChurchSearch> = {}): ChurchSearch => ({ q: null, position: null, radius: 25, cursor: null, limit: 50, ...over });
const mine = <T extends { id: string }>(rows: T[]): T[] => rows.filter((r) => orgs.has(r.id));

afterAll(async () => {
  // Test cleanup only: application code never deletes audit entries (the log is append-only).
  const ids = [...orgs];
  if (ids.length > 0) {
    await db.delete(churchService).where(inArray(churchService.orgId, ids));
    await db.delete(churchProfile).where(inArray(churchProfile.orgId, ids));
    await db.delete(organization).where(inArray(organization.id, ids));
  }
  await db.delete(auditLog).where(like(auditLog.actorId, `user_${PREFIX}%`));
});

describe("churches against the real database (S18)", () => {
  it("saves a profile, replaces it on the second save, and keeps one row per church", async () => {
    const id = await newChurch("Upsert");
    await repo.saveProfile(profile(id), audit(id, "church.profile.save"));
    await repo.saveProfile(profile(id, { city: "Joplin", lat: null, lng: null }), audit(id, "church.profile.save"));
    const row = await repo.getProfile(id);
    expect(row).toMatchObject({ orgId: id, city: "Joplin", lat: null, lng: null, country: "US", timeZone: "America/Chicago" });
    expect(await repo.getProfile(crypto.randomUUID())).toBeNull();
    const audits = await db.select().from(auditLog).where(like(auditLog.subject, `organization:${id}`));
    expect(audits).toHaveLength(2);
  });

  it("replaces the whole list of services in order, and an empty list clears it", async () => {
    const id = await newChurch("Services");
    await repo.saveServices(id, [{ weekday: 0, startTime: "10:00", label: "Morning", note: "" }, { weekday: 3, startTime: "19:00", label: "Prayer", note: "Childcare" }], audit(id, "church.services.save"));
    expect((await repo.listServices([id])).map((s) => `${s.position} ${s.label} ${s.note}`)).toEqual(["0 Morning ", "1 Prayer Childcare"]);
    await repo.saveServices(id, [{ weekday: 6, startTime: "09:00", label: "Saturday", note: "" }], audit(id, "church.services.save"));
    expect((await repo.listServices([id])).map((s) => s.label)).toEqual(["Saturday"]);
    await repo.saveServices(id, [], audit(id, "church.services.save"));
    expect(await repo.listServices([id])).toEqual([]);
    expect(await repo.listServices([])).toEqual([]);
  });

  it("a save that fails halfway changes nothing, not even the audit entry", async () => {
    const id = await newChurch("Atomic");
    await repo.saveServices(id, [{ weekday: 0, startTime: "10:00", label: "Keep me", note: "" }], audit(id, "church.services.save"));
    // Two services with the same position cannot exist, so a list that breaks the unique rule fails after the delete statement ran.
    const broken = [{ weekday: 1, startTime: "10:00", label: "A", note: "" }, { weekday: 1, startTime: "10:00", label: "B", note: "x".repeat(10) }];
    const original = repo.saveServices;
    await expect(
      // A weekday that cannot be stored (text where an integer belongs) makes the insert fail.
      original(id, broken.map((s) => ({ ...s, weekday: "bad" as unknown as number })), audit(id, "church.services.save")),
    ).rejects.toThrow();
    expect((await repo.listServices([id])).map((s) => s.label)).toEqual(["Keep me"]);
    const audits = await db.select().from(auditLog).where(like(auditLog.subject, `organization:${id}`));
    expect(audits).toHaveLength(1); // only the first, successful save
  });

  it("searches by name or city, case-insensitively, and treats a typed % or _ as itself", async () => {
    const a = await newChurch("Grace Fellowship");
    const b = await newChurch("River Church");
    const c = await newChurch("100% Church");
    await repo.saveProfile(profile(a), audit(a, "x"));
    await repo.saveProfile(profile(b, { city: "Nixa", lat: null, lng: null }), audit(b, "x"));
    await repo.saveProfile(profile(c, { city: "Ozark" }), audit(c, "x"));
    const byName = mine(await repo.search(search({ q: `${PREFIX}grace` })));
    expect(byName.map((r) => r.name)).toEqual([`${PREFIX}Grace Fellowship`]);
    expect(mine(await repo.search(search({ q: "NIXA" }))).map((r) => r.id)).toEqual([b]); // by city, and no pin is fine for text
    expect(mine(await repo.search(search({ q: `${PREFIX}100%` }))).map((r) => r.id)).toEqual([c]);
    expect(mine(await repo.search(search({ q: "%" }))).map((r) => r.id)).toEqual([c]); // a lone % matches only a name that contains a %, not every church
    expect(mine(await repo.search(search({ q: "_race" })))).toHaveLength(0); // _ is not "any one letter": it must not find "Grace"
  });

  it("searches by position within a radius, nearest first, with distances, skipping churches without a pin and unapproved ones", async () => {
    const near = await newChurch("Near");
    const mid = await newChurch("Mid");
    const far = await newChurch("Far");
    const nopin = await newChurch("NoPin");
    const pending = await newChurch("Pending", "pending");
    await repo.saveProfile(profile(near, { lat: 10.01, lng: 20 }), audit(near, "x"));
    await repo.saveProfile(profile(mid, { lat: 10.2, lng: 20 }), audit(mid, "x"));
    await repo.saveProfile(profile(far, { lat: 13.0, lng: 20 }), audit(far, "x"));
    await repo.saveProfile(profile(nopin, { lat: null, lng: null }), audit(nopin, "x"));
    await repo.saveProfile(profile(pending, { lat: 10, lng: 20 }), audit(pending, "x"));
    const rows = mine(await repo.search(search({ position: { lat: 10, lng: 20 }, radius: 50 })));
    expect(rows.map((r) => r.id)).toEqual([near, mid]);
    expect(rows[0].distance).toBeLessThan(2);
    expect(rows[1].distance).toBeGreaterThan(rows[0].distance as number);
    expect(mine(await repo.search(search({ position: { lat: 10, lng: 20 }, radius: 500 }))).map((r) => r.id)).toEqual([near, mid, far]);
    expect(mine(await repo.search(search({ q: `${PREFIX}pending` })))).toHaveLength(0);
  });

  it("pages by a keyset: each church once, in order, none skipped", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const id = await newChurch(`Page ${i}`);
      ids.push(id);
      await repo.saveProfile(profile(id, { lat: 37.2 + i * 0.01 }), audit(id, "x"));
    }
    const seen: string[] = [];
    let cursor: ChurchSearch["cursor"] = null;
    for (let page = 0; page < 10; page++) {
      const rows = await repo.search(search({ q: `${PREFIX}Page`, position: { lat: 37.2, lng: -93.3 }, radius: 100, limit: 2, cursor }));
      const shown = rows.slice(0, 2);
      seen.push(...shown.map((r) => r.id));
      if (rows.length <= 2) break;
      const last = shown[shown.length - 1];
      cursor = { distance: last.distance, name: last.name, id: last.id };
    }
    expect(seen).toEqual(ids);
    // The same by name, with no position.
    const byName: string[] = [];
    let nameCursor: ChurchSearch["cursor"] = null;
    for (let page = 0; page < 10; page++) {
      const rows = await repo.search(search({ q: `${PREFIX}Page`, limit: 2, cursor: nameCursor }));
      const shown = rows.slice(0, 2);
      byName.push(...shown.map((r) => r.id));
      if (rows.length <= 2) break;
      const last = shown[shown.length - 1];
      nameCursor = { distance: null, name: last.name, id: last.id };
    }
    expect(byName).toEqual(ids);
  });

  it("keeps a church outside the United States with its region, country and an empty postal code", async () => {
    const id = await newChurch("Kibera");
    await repo.saveProfile(profile(id, { city: "Kibera", state: "Nairobi County", country: "KE", lat: -1.3133, lng: 36.7881 }), audit(id, "x"));
    const rows = mine(await repo.search(search({ position: { lat: -1.2921, lng: 36.8219 }, radius: 25 })));
    expect(rows[0]).toMatchObject({ id, city: "Kibera", state: "Nairobi County", country: "KE" });
  });
});
