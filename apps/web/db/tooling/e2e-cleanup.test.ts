import { describe, expect, it } from "vitest";

import { E2E_CLEANUP_STATEMENTS, E2E_CONTACT_NAME_PREFIX } from "./e2e-cleanup";

// The cleanup deletes only rows the browser tests created. A delete with no filter, or one that is not tied to
// the test prefix, would wipe real data, so every statement is checked.
describe("browser test cleanup", () => {
  it("only deletes, only with a where clause tied to the e2e prefix", () => {
    expect(E2E_CLEANUP_STATEMENTS.length).toBeGreaterThan(0);
    for (const statement of E2E_CLEANUP_STATEMENTS) {
      expect(statement).toMatch(/^delete from [a-z_]+ where /);
      expect(statement).toContain(`'${E2E_CONTACT_NAME_PREFIX}%'`);
      expect(statement).not.toMatch(/;|--|\bdrop\b|\btruncate\b|\bor\b/i);
    }
  });

  it("the prefix is specific enough that no real person's name matches it", () => {
    expect(E2E_CONTACT_NAME_PREFIX).toMatch(/^e2e-[a-z]+-$/);
  });
});
