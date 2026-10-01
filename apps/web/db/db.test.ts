import { describe, expect, it } from "vitest";

import { createDb, type Database } from "./client";
import { DatabaseError, toDatabaseError, withDbErrors } from "./errors";
import { checkDatabaseConnection } from "./health";

describe("database error handling", () => {
  it.each([
    ["23505", "unique_violation"],
    ["23503", "foreign_key_violation"],
    ["23502", "not_null_violation"],
    ["40001", "serialization_failure"],
    ["08006", "connection"],
    ["XX000", "unknown"],
  ])("maps Postgres code %s to %s", (code, kind) => {
    expect(toDatabaseError("op", Object.assign(new Error("raw"), { code })).kind).toBe(kind);
  });

  it("finds the code on a wrapped cause", () => {
    const wrapped = new Error("wrapper", { cause: { code: "23505" } });
    expect(toDatabaseError("op", wrapped).kind).toBe("unique_violation");
  });

  it("does not leak the raw driver message or SQL", async () => {
    const raw = new Error("insert into t values ('secret') postgres://user:pw@host/db");
    const err = await withDbErrors("createThing", () => Promise.reject(raw)).catch((e) => e);
    expect(err).toBeInstanceOf(DatabaseError);
    expect(err.message).toBe('Database operation "createThing" failed (unknown).');
    expect(err.message).not.toMatch(/secret|postgres:/);
    expect(err.cause).toBe(raw);
  });

  it("passes results through and does not double-wrap", async () => {
    await expect(withDbErrors("op", async () => 42)).resolves.toBe(42);
    const inner = new DatabaseError("unknown", "inner", null);
    expect(toDatabaseError("outer", inner)).toBe(inner);
  });
});

describe("checkDatabaseConnection", () => {
  const fake = (rows: unknown[]) => ({ execute: async () => ({ rows }) }) as unknown as Database;

  it("succeeds on SELECT 1", async () => {
    await expect(checkDatabaseConnection(fake([{ ok: 1 }]))).resolves.toBeUndefined();
  });

  it("fails with DatabaseError on an unexpected response", async () => {
    await expect(checkDatabaseConnection(fake([]))).rejects.toBeInstanceOf(DatabaseError);
  });
});

describe("driver decision (neon-http)", () => {
  it("has no interactive transactions; atomic writes use db.batch", async () => {
    const db = createDb("postgresql://user:pw@localhost.invalid/db");
    await expect(db.transaction(async () => {})).rejects.toThrow(/No transactions support/);
    expect(typeof db.batch).toBe("function");
  });
});
