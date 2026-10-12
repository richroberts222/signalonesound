import { describe, expect, it } from "vitest";

import { E2E_CLEANUP_STATEMENTS, E2E_COUPON_CODE_PREFIX, E2E_PERK_KEY_PREFIX, E2E_PLAN_NAME_PREFIX, E2E_PREFIXES } from "./e2e-cleanup";

// The cleanup deletes only rows the browser tests created. A delete with no filter, or one that is not tied to
// a test prefix, would wipe real data, so every statement is checked.
describe("browser test cleanup", () => {
  it("only deletes, only with a where clause tied to an e2e prefix", () => {
    expect(E2E_CLEANUP_STATEMENTS.length).toBeGreaterThan(0);
    for (const statement of E2E_CLEANUP_STATEMENTS) {
      expect(statement).toMatch(/^delete from [a-z_]+ where /);
      expect(E2E_PREFIXES.some((prefix) => statement.includes(`'${prefix}%'`) || statement.includes(`'%${prefix}%'`)), statement).toBe(true);
      expect(statement).not.toMatch(/;|--|\bdrop\b|\btruncate\b|\bupdate\b/i);
    }
  });

  it("the prefixes are specific enough that no real name, key or code matches them", () => {
    for (const prefix of E2E_PREFIXES) expect(prefix.toLowerCase()).toMatch(/^e2e[-_]/);
    expect(E2E_PLAN_NAME_PREFIX).toBe("e2e-plan-");
    expect(E2E_PERK_KEY_PREFIX).toBe("e2e_perk_");
    expect(E2E_COUPON_CODE_PREFIX).toBe("E2E-");
  });

  it("removes what points at a plan or perk before the plan or perk itself", () => {
    const at = (text: string) => E2E_CLEANUP_STATEMENTS.findIndex((s) => s.startsWith(text));
    expect(at("delete from billing_plan_perk")).toBeLessThan(at("delete from billing_perk"));
    expect(at("delete from billing_price")).toBeLessThan(at("delete from billing_plan where"));
    expect(at("delete from billing_subscription where plan_id")).toBeLessThan(at("delete from billing_plan where"));
    expect(at("delete from billing_coupon_use")).toBeLessThan(at("delete from billing_coupon where"));
  });
});
