import { MAX_PAGE_SIZE } from "@signalone/shared";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { emailSchema, paginationSchema, toFieldErrors, uuidSchema } from "./common";

describe("emailSchema", () => {
  it("trims and lowercases valid addresses", () => {
    expect(emailSchema.parse("  User@Example.COM ")).toBe("user@example.com");
  });

  it("rejects malformed addresses", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });
});

describe("uuidSchema", () => {
  it("accepts a UUID and rejects other strings", () => {
    expect(uuidSchema.safeParse("123e4567-e89b-42d3-a456-426614174000").success).toBe(true);
    expect(uuidSchema.safeParse("123").success).toBe(false);
  });
});

describe("paginationSchema", () => {
  it("applies a default limit and coerces numeric strings", () => {
    expect(paginationSchema.parse({}).limit).toBeGreaterThan(0);
    expect(paginationSchema.parse({ limit: "5" }).limit).toBe(5);
  });

  it("enforces limit boundaries", () => {
    expect(paginationSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(paginationSchema.safeParse({ limit: MAX_PAGE_SIZE }).success).toBe(true);
    expect(paginationSchema.safeParse({ limit: MAX_PAGE_SIZE + 1 }).success).toBe(false);
    expect(paginationSchema.safeParse({ limit: 1.5 }).success).toBe(false);
  });

  it("rejects an empty cursor", () => {
    expect(paginationSchema.safeParse({ cursor: "" }).success).toBe(false);
  });
});

describe("toFieldErrors", () => {
  it("keys messages by dotted path and groups multiple issues", () => {
    const schema = z.object({ a: z.object({ b: z.string().min(3).regex(/^x/) }) });
    const result = schema.safeParse({ a: { b: "y" } });
    if (result.success) throw new Error("expected failure");
    expect(toFieldErrors(result.error)["a.b"]).toHaveLength(2);
  });

  it("uses _ for root-level issues", () => {
    const result = z.string().safeParse(1);
    if (result.success) throw new Error("expected failure");
    expect(Object.keys(toFieldErrors(result.error))).toEqual(["_"]);
  });
});
