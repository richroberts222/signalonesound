import { fail, ok, paginated, type Paginated } from "@signalone/shared";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { apiErrorSchema, idSchema, paginatedSchema, parseInput, resultSchema } from "./contracts";

describe("idSchema", () => {
  it("accepts opaque non-empty strings and rejects empty", () => {
    expect(idSchema.safeParse("abc_123").success).toBe(true);
    expect(idSchema.safeParse("").success).toBe(false);
    expect(idSchema.safeParse(5).success).toBe(false);
  });
});

describe("apiErrorSchema", () => {
  it("accepts a failed Result's error and rejects unknown codes", () => {
    const r = fail("validation_failed", "bad", { a: ["x"] });
    if (r.ok) throw new Error("unreachable");
    expect(apiErrorSchema.safeParse(r.error).success).toBe(true);
    expect(apiErrorSchema.safeParse({ code: "db_exploded", message: "x" }).success).toBe(false);
  });
});

describe("resultSchema", () => {
  const schema = resultSchema(z.object({ n: z.number() }));

  it("round-trips ok and fail results through JSON", () => {
    expect(schema.safeParse(JSON.parse(JSON.stringify(ok({ n: 1 })))).success).toBe(true);
    expect(schema.safeParse(JSON.parse(JSON.stringify(fail("forbidden", "no")))).success).toBe(true);
  });

  it("rejects mismatched data and mixed shapes", () => {
    expect(schema.safeParse({ ok: true, data: { n: "1" } }).success).toBe(false);
    expect(schema.safeParse({ ok: false, data: { n: 1 } }).success).toBe(false);
  });
});

describe("paginatedSchema", () => {
  const schema = paginatedSchema(idSchema);

  it("accepts pages with and without a next cursor", () => {
    expect(schema.safeParse(paginated(["a"])).success).toBe(true);
    expect(schema.safeParse(paginated(["a"], "c1")).success).toBe(true);
  });

  it("rejects bad items, empty cursor, and missing cursor", () => {
    expect(schema.safeParse({ items: [""], nextCursor: null }).success).toBe(false);
    expect(schema.safeParse({ items: [], nextCursor: "" }).success).toBe(false);
    expect(schema.safeParse({ items: [] }).success).toBe(false);
  });

  it("derived type is assignable to the shared Paginated type", () => {
    const page: z.infer<typeof schema> = { items: ["a"], nextCursor: null };
    const shared: Paginated<string> = page;
    expect(shared.items).toEqual(["a"]);
  });
});

describe("parseInput", () => {
  const schema = z.object({ name: z.string().min(2), age: z.number().optional() });

  it("returns ok with parsed data", () => {
    expect(parseInput(schema, { name: "Al" })).toEqual({ ok: true, data: { name: "Al" } });
  });

  it("returns validation_failed with path-keyed field errors", () => {
    const r = parseInput(schema, { name: "A" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("validation_failed");
      expect(r.error.fieldErrors?.name?.length).toBeGreaterThan(0);
    }
  });

  it("uses '_' for root-level errors and does not echo input", () => {
    const r = parseInput(schema, "secret-value");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.fieldErrors?._).toBeDefined();
      expect(JSON.stringify(r.error)).not.toContain("secret-value");
    }
  });
});
