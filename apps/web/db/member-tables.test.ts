import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createFakeMemberRepo } from "./member.fake";
import { MEMBER_TABLES } from "./member";

// Export and deletion completeness (docs/data-inventory.md, S1 AC4/AC5). A member's data export and
// account deletion are built from MEMBER_TABLES. If the schema gains a table that holds a member's
// data and it is not listed there, export and deletion would silently miss it: this fails instead.
const schemaPath = path.join(__dirname, "schema.ts");
const OWNER_COLUMN = /"(user_id|owner_id|clerk_user_id|actor_id)"/;

/** Tables in the schema text that have a column naming a member as owner. */
export function memberOwnedTables(source: string): string[] {
  const tables = [...source.matchAll(/pgTable\(\s*"([a-z0-9_]+)"/g)];
  return tables
    .filter((table, i) => {
      const end = i + 1 < tables.length ? (tables[i + 1].index ?? source.length) : source.length;
      return OWNER_COLUMN.test(source.slice(table.index ?? 0, end));
    })
    .map((t) => t[1])
    .sort();
}

describe("member data tables", () => {
  it("lists every table that holds a member's data", () => {
    const owned = memberOwnedTables(readFileSync(schemaPath, "utf8"));
    expect(owned.length).toBeGreaterThan(0);
    expect([...MEMBER_TABLES].sort()).toEqual(owned);
  });

  it("the scanner finds an unlisted member-owned table (self-test)", () => {
    const source = `
      export const a = pgTable("a", { id: uuid("id"), userId: text("user_id") });
      export const b = pgTable("b", { id: uuid("id"), label: text("label") });
      export const c = pgTable("c", { ownerId: text("owner_id") });`;
    expect(memberOwnedTables(source)).toEqual(["a", "c"]);
  });

  it("the export covers exactly the listed tables", async () => {
    const exported = await createFakeMemberRepo().exportAll("anyone");
    expect(Object.keys(exported).sort()).toEqual([...MEMBER_TABLES].sort());
  });
});
