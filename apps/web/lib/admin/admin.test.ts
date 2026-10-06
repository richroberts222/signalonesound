import { describe, expect, it } from "vitest";
import {
  classifyRows,
  computeOutcome,
  resolutionOptions,
  summarize,
  unresolvedLines,
  validateRow,
} from "./import";
import { IMPORT_ROWS, MOCK_ADMIN_EVENTS, MOCK_ORGS, MOCK_SUBMISSIONS } from "./mock-data";
import { applyModeration, matchesQuery, pendingCount } from "./moderation";

describe("import classification", () => {
  const classes = classifyRows(IMPORT_ROWS, MOCK_ADMIN_EVENTS);

  it("covers every fictional sample row with each case the UI demonstrates", () => {
    expect(classes.size).toBe(IMPORT_ROWS.length);
    expect(summarize(classes)).toEqual({ total: 8, ready: 1, invalid: 4, duplicates: 1, conflicts: 2 });
  });

  it("flags invalid dates, missing organization, bad times, and bad ZIPs", () => {
    const fields = (line: number) => {
      const c = classes.get(line);
      return c?.kind === "invalid" ? c.issues.map((i) => i.field) : [];
    };
    expect(fields(5)).toEqual(["date"]);
    expect(fields(6)).toEqual(["organization"]);
    expect(fields(7)).toEqual(["startTime"]);
    expect(fields(8)).toEqual(["zip"]);
  });

  it("detects an in-file duplicate and existing-event conflicts", () => {
    expect(classes.get(9)).toEqual({ kind: "duplicate-in-file", ofLine: 2 });
    expect(classes.get(3)).toMatchObject({ kind: "conflict", withEventId: "evt-prayer-evening" });
    expect(classes.get(4)).toMatchObject({ kind: "conflict", withEventId: "evt-fall-harvest" });
  });

  it("rejects impossible calendar dates", () => {
    const row = { ...IMPORT_ROWS[0], date: "2026-02-30" };
    expect(validateRow(row).map((i) => i.field)).toEqual(["date"]);
  });
});

describe("import resolution", () => {
  const classes = classifyRows(IMPORT_ROWS, MOCK_ADMIN_EVENTS);

  it("only lets invalid rows be skipped, and offers update only for conflicts", () => {
    expect(resolutionOptions(classes.get(5)!)).toEqual(["skip"]);
    expect(resolutionOptions(classes.get(9)!)).toEqual(["skip", "import-anyway"]);
    expect(resolutionOptions(classes.get(3)!)).toContain("update-existing");
    expect(resolutionOptions(classes.get(2)!)).toEqual([]);
  });

  it("reports unresolved rows until each non-ok row has a choice", () => {
    expect(unresolvedLines(classes, {})).toEqual([3, 4, 5, 6, 7, 8, 9]);
    const all = Object.fromEntries([3, 4, 5, 6, 7, 8, 9].map((l) => [l, "skip" as const]));
    expect(unresolvedLines(classes, all)).toEqual([]);
  });

  it("counts the outcome from choices without persisting anything", () => {
    const choices = { 3: "skip", 4: "update-existing", 9: "import-anyway" } as const;
    expect(computeOutcome(classes, { ...choices, 5: "skip", 6: "skip", 7: "skip", 8: "skip" })).toEqual({
      wouldCreate: 2,
      wouldUpdate: 1,
      wouldSkip: 5,
    });
  });
});

describe("moderation", () => {
  it("decides only pending submissions and keeps decisions final", () => {
    expect(applyModeration("pending", "approve")).toBe("approved");
    expect(applyModeration("pending", "reject")).toBe("rejected");
    expect(applyModeration("approved", "reject")).toBe("approved");
    expect(applyModeration("rejected", "approve")).toBe("rejected");
  });

  it("counts pending submissions", () => {
    expect(pendingCount(["pending", "approved", "pending", "rejected"])).toBe(2);
  });
});

describe("search and mock data integrity", () => {
  it("matches case-insensitively across fields and treats a blank query as all", () => {
    expect(matchesQuery("franklin", ["Harvest Gate", "Franklin"])).toBe(true);
    expect(matchesQuery("  ", ["anything"])).toBe(true);
    expect(matchesQuery("zzz", ["Harvest Gate", "Franklin"])).toBe(false);
  });

  it("keeps cross-references in the mock data valid and covers all four event sources", () => {
    const orgIds = new Set(MOCK_ORGS.map((o) => o.id));
    for (const e of MOCK_ADMIN_EVENTS) if (e.orgId) expect(orgIds.has(e.orgId)).toBe(true);
    expect(new Set(MOCK_ADMIN_EVENTS.map((e) => e.source))).toEqual(
      new Set(["church", "community", "admin", "import"]),
    );
    const eventIds = new Set(MOCK_ADMIN_EVENTS.map((e) => e.id));
    for (const s of MOCK_SUBMISSIONS) if (s.possibleDuplicateOf) expect(eventIds.has(s.possibleDuplicateOf)).toBe(true);
  });
});
