import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { REVIVAL_TYPE_SLUGS } from "@signalone/validation";

import { DEMO_EVENTS, DEMO_ORGS, DEMO_SEEDS, demoStatements } from "./demo-seed";

// The demo data is fictional and safe to show: sample names only, real revival types, plausible places, no
// person or secret. These tests keep it that way as it grows.
describe("demo seed data", () => {
  it("every church is marked as a sample, in its name and its description", () => {
    const statements = demoStatements().filter((s) => s.startsWith("INSERT INTO organization ("));
    expect(statements).toHaveLength(DEMO_ORGS.length);
    for (const org of DEMO_ORGS) expect(org.name).toMatch(/\(Sample\)$/);
    for (const s of statements) expect(s).toContain("Sample listing for demonstration only");
  });

  it("every event belongs to a church and uses only real revival types", () => {
    for (const e of DEMO_EVENTS) {
      expect(e.org, e.title).toBeGreaterThanOrEqual(0);
      expect(e.org, e.title).toBeLessThan(DEMO_ORGS.length);
      expect(e.types.length, e.title).toBeGreaterThan(0);
      for (const t of e.types) expect(REVIVAL_TYPE_SLUGS as string[], `${e.title}: ${t}`).toContain(t);
      expect(e.inDays, e.title).toBeGreaterThan(0);
      expect(/^\d{2}:\d{2}$/.test(e.start), e.title).toBe(true);
    }
  });

  it("has enough variety to demonstrate search: several places, several types, and one cancelled event", () => {
    expect(new Set(DEMO_ORGS.map((o) => o.state)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(DEMO_EVENTS.flatMap((e) => e.types)).size).toBeGreaterThanOrEqual(8);
    expect(DEMO_EVENTS.filter((e) => e.cancelled)).toHaveLength(1);
    expect(DEMO_EVENTS.filter((e) => DEMO_ORGS[e.org].city === "Nashville").length).toBeGreaterThanOrEqual(4);
  });

  it("builds statements that cannot create duplicates or break out of their quotes", () => {
    for (const s of demoStatements()) {
      // Inserts never overwrite; the only deletes allowed are of the first version's own plain-hash ids.
      if (s.startsWith("DELETE FROM ")) {
        expect(s).toMatch(/ = md5\('demo-(org|event)-\d+'\)::uuid$/);
        continue;
      }
      expect(s).toMatch(/^INSERT INTO /);
      expect(s).toMatch(/ON CONFLICT DO NOTHING$/);
      // Text inside quotes may hold any character; outside the quotes there must be no second statement.
      expect(s.replace(/'(?:[^']|'')*'/g, "''").includes(";")).toBe(false);
    }
    const unique = new Set(demoStatements().filter((s) => s.startsWith("INSERT INTO event (")));
    expect(unique.size).toBe(DEMO_EVENTS.length);
  });

  it("contains no email address, phone number, credential or real-looking person", () => {
    const text = JSON.stringify([DEMO_ORGS, DEMO_EVENTS]);
    expect(text).not.toMatch(/@|\bhttps?:\/\/(?!example\.org)|password|secret|token|\d{3}[-. ]\d{3}[-. ]\d{4}/i);
  });

  // The app's contracts require strict UUIDs. A plain md5 hash is not one (its version and variant digits are
  // arbitrary), which made every client reject the whole reply: the phone showed "could not load events".
  it("builds ids that pass the app's strict UUID check (a plain hash does not)", () => {
    const strict = z.uuid();
    const hex = (kind: string, n: number) => createHash("md5").update(`demo-${kind}-${n}`).digest("hex");
    const asUuid = (h: string) => `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    const fixed = (h: string) => asUuid(`${h.slice(0, 12)}4${h.slice(13, 16)}8${h.slice(17)}`);
    const all = [...DEMO_ORGS.map((_, i) => hex("org", i)), ...DEMO_EVENTS.map((_, n) => hex("event", n))];
    expect(all.some((h) => !strict.safeParse(asUuid(h)).success)).toBe(true); // the old way really was invalid
    for (const h of all) expect(strict.safeParse(fixed(h)).success).toBe(true);
    // And the SQL really applies those two digit fixes to every inserted id.
    for (const s of demoStatements().filter((x) => x.startsWith("INSERT INTO organization (") || x.startsWith("INSERT INTO event ("))) {
      expect(s).toContain("placing '4' from 13 for 1");
      expect(s).toContain("placing '8' from 17 for 1");
    }
  });

  it("is one seed with a stable id, so the ledger runs it once", () => {
    expect(DEMO_SEEDS).toHaveLength(1);
    expect(DEMO_SEEDS[0].id).toBe("demo-churches-and-events-v2");
  });
});
