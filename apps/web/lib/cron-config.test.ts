import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Scheduled jobs (S6, docs/environment.md CRON_SECRET). Every path in vercel.json must be a real job
// route, and no job route may exist that is never scheduled, so a renamed route cannot silently stop
// the retention job from running.
const web = join(__dirname, "..");
const config = JSON.parse(readFileSync(join(web, "vercel.json"), "utf8")) as { crons?: { path: string; schedule: string }[] };

describe("vercel.json cron schedule", () => {
  it("lists at least one job, each with a valid five-field schedule", () => {
    expect(config.crons?.length).toBeGreaterThan(0);
    for (const cron of config.crons ?? []) expect(cron.schedule.trim().split(/\s+/), cron.path).toHaveLength(5);
  });

  it("every scheduled path is a job route that exists under /api/v1/internal/jobs", () => {
    for (const cron of config.crons ?? []) {
      expect(cron.path, cron.path).toMatch(/^\/api\/v1\/internal\/jobs\/[a-z-]+$/);
      const file = join(web, "app", ...cron.path.split("/").filter(Boolean), "route.ts");
      expect(existsSync(file), `${cron.path} has no route file`).toBe(true);
      expect(readFileSync(file, "utf8"), `${cron.path} must check the scheduler secret`).toContain("isJobRequestAuthorized");
    }
  });

  it("every job route is scheduled", () => {
    const jobsDir = join(web, "app", "api", "v1", "internal", "jobs");
    const scheduled = new Set((config.crons ?? []).map((c) => c.path.split("/").pop()));
    for (const name of readdirSync(jobsDir)) expect(scheduled.has(name), `${name} is never scheduled`).toBe(true);
  });
});
