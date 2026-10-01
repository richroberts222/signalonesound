import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { DatabaseError } from "../../db/errors";
import { authorize, isOwner } from "../auth/authorize";
import { ForbiddenError, UnauthenticatedError } from "../auth/errors";
import {
  createAtomicRunner,
  createServiceContext,
  notFound,
  runService,
  toAppError,
  validationFailed,
  type AtomicRunner,
  type ServiceContext,
} from "./index";

// Generic example service. "Item" is a placeholder, not a Signal One domain
// entity: it only demonstrates the conventions in /docs/services.md.
type Item = { id: string; ownerId: string; title: string };
type ItemRepo = {
  findById(id: string): Promise<Item | null>;
  insertStatement(item: Item): unknown;
  auditStatement(itemId: string): unknown;
};
type Deps = { items: ItemRepo; atomic: AtomicRunner; newId: () => string };

const isItemOwner = isOwner<Item>((item) => item.ownerId);

const createItemService = (deps: Deps) => ({
  // Typed input, no FormData/Request. Identity from ctx, never from input.
  async rename(ctx: ServiceContext, input: { id: string; title: string }) {
    if (input.title.trim() === "") {
      throw validationFailed("Invalid input", { title: ["Required"] });
    }
    const item = await deps.items.findById(input.id);
    if (!item) throw notFound();
    await authorize(ctx.actor, isItemOwner, item);
    return { ...item, title: input.title.trim() };
  },
  // Two writes that must succeed or fail together.
  async create(ctx: ServiceContext, input: { title: string }) {
    const item: Item = { id: deps.newId(), ownerId: ctx.actor.userId, title: input.title };
    await deps.atomic("item.create", [
      deps.items.insertStatement(item),
      deps.items.auditStatement(item.id),
    ] as never);
    return item;
  },
});

const stored: Item = { id: "i1", ownerId: "user_a", title: "Old" };
const makeDeps = (over: Partial<Deps> = {}): Deps => ({
  items: {
    findById: async (id) => (id === stored.id ? stored : null),
    insertStatement: (i) => ({ insert: i }),
    auditStatement: (id) => ({ audit: id }),
  },
  atomic: vi.fn(async () => []),
  newId: () => "new1",
  ...over,
});
const ctxA = createServiceContext("user_a");
const ctxB = createServiceContext("user_b");

describe("service conventions (fake dependencies)", () => {
  it("returns data on success", async () => {
    const svc = createItemService(makeDeps());
    expect(await runService(() => svc.rename(ctxA, { id: "i1", title: " New " }))).toEqual({
      ok: true,
      data: { ...stored, title: "New" },
    });
  });

  it("maps validation failures with field errors", async () => {
    const svc = createItemService(makeDeps());
    const r = await runService(() => svc.rename(ctxA, { id: "i1", title: " " }));
    expect(r).toEqual({
      ok: false,
      error: { code: "validation_failed", message: "Invalid input", fieldErrors: { title: ["Required"] } },
    });
  });

  it("maps missing resources to not_found", async () => {
    const svc = createItemService(makeDeps());
    const r = await runService(() => svc.rename(ctxA, { id: "nope", title: "x" }));
    expect(r).toMatchObject({ ok: false, error: { code: "not_found" } });
  });

  it("denies a non-owner (forbidden) using the shared authorization primitives", async () => {
    const svc = createItemService(makeDeps());
    const r = await runService(() => svc.rename(ctxB, { id: "i1", title: "x" }));
    expect(r).toMatchObject({ ok: false, error: { code: "forbidden" } });
  });

  it("derives ownership from the context, not from input", async () => {
    const atomic = vi.fn(async () => []);
    const svc = createItemService(makeDeps({ atomic }));
    const r = await runService(() => svc.create(ctxA, { title: "T", ownerId: "user_b" } as { title: string }));
    expect(r).toMatchObject({ ok: true, data: { ownerId: "user_a" } });
  });

  it("runs multi-statement writes through the injected atomic runner as one unit", async () => {
    const atomic = vi.fn(async () => []);
    const svc = createItemService(makeDeps({ atomic }));
    await svc.create(ctxA, { title: "T" });
    expect(atomic).toHaveBeenCalledTimes(1);
    expect(atomic).toHaveBeenCalledWith("item.create", [
      { insert: { id: "new1", ownerId: "user_a", title: "T" } },
      { audit: "new1" },
    ]);
  });

  it("propagates atomic failures and never leaks internals", async () => {
    const atomic = vi.fn(async () => {
      throw new DatabaseError("unknown", "item.create", new Error("SELECT secret FROM t"));
    });
    const onUnexpected = vi.fn();
    const svc = createItemService(makeDeps({ atomic }));
    const r = await runService(() => svc.create(ctxA, { title: "T" }), onUnexpected);
    expect(r).toEqual({ ok: false, error: { code: "internal", message: "Something went wrong" } });
    expect(JSON.stringify(r)).not.toContain("SELECT");
    expect(onUnexpected).toHaveBeenCalledOnce();
  });
});

describe("toAppError", () => {
  it("maps auth errors", () => {
    expect(toAppError(new UnauthenticatedError()).code).toBe("unauthenticated");
    expect(toAppError(new ForbiddenError()).code).toBe("forbidden");
  });

  it("maps unique violations to conflict and other database errors to internal", () => {
    expect(toAppError(new DatabaseError("unique_violation", "op", new Error("x")))).toEqual({
      code: "conflict",
      message: "Conflict",
    });
    const onUnexpected = vi.fn();
    expect(toAppError(new DatabaseError("connection", "op", new Error("x")), onUnexpected).code).toBe(
      "internal",
    );
    expect(onUnexpected).toHaveBeenCalledOnce();
  });

  it("does not call onUnexpected for expected errors", () => {
    const onUnexpected = vi.fn();
    toAppError(notFound(), onUnexpected);
    toAppError(new ForbiddenError(), onUnexpected);
    expect(onUnexpected).not.toHaveBeenCalled();
  });

  it("hides the message of unknown errors", () => {
    expect(toAppError(new Error("boom: password=x"))).toEqual({
      code: "internal",
      message: "Something went wrong",
    });
  });
});

describe("createAtomicRunner", () => {
  it("passes statements to db.batch in one call", async () => {
    const batch = vi.fn(async () => [1, 2]);
    const run = createAtomicRunner({ batch } as never);
    expect(await run("op", ["a", "b"] as never)).toEqual([1, 2]);
    expect(batch).toHaveBeenCalledWith(["a", "b"]);
  });

  it("wraps driver failures as DatabaseError", async () => {
    const batch = vi.fn(async () => {
      throw Object.assign(new Error("dup"), { code: "23505" });
    });
    const run = createAtomicRunner({ batch } as never);
    await expect(run("op", [] as never)).rejects.toMatchObject({ name: "DatabaseError", kind: "unique_violation" });
  });
});

describe("service layer boundaries (static)", () => {
  const files = readdirSync(__dirname).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  const source = (f: string) =>
    readFileSync(join(__dirname, f), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

  it("service code has no framework, Clerk, or database-client imports", () => {
    const forbidden = /from\s+["'](react|react-native|expo|next|@clerk\/|server-only|drizzle-orm|@neondatabase\/|.*\/db\/(index|client)["'])/;
    for (const f of files) {
      for (const line of source(f).split("\n").filter((l) => /^\s*(import|export)\b.*from/.test(l) && !/^\s*import type\b/.test(l))) {
        expect(line, f).not.toMatch(forbidden);
      }
    }
    expect(files).toContain("run.ts");
  });

  it("service code does not use FormData, Request, or process.env", () => {
    for (const f of files) expect(source(f), f).not.toMatch(/\b(FormData|NextRequest|NextResponse|process\.env)\b/);
  });
});
