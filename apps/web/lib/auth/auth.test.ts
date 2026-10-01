import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const authMock = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({ auth: () => authMock() }));

import { ForbiddenError, UnauthenticatedError, isAuthError } from "./errors";
import { allOf, anyOf, authorize, can, isOwner } from "./authorize";
import { getUserId, requireUserId } from "./server";

beforeEach(() => authMock.mockReset());

describe("authentication helpers (Clerk mocked)", () => {
  it("accepts an authenticated identity and exposes the Clerk user ID", async () => {
    authMock.mockResolvedValue({ userId: "user_123" });
    expect(await getUserId()).toBe("user_123");
    expect(await requireUserId()).toBe("user_123");
  });

  it("rejects unauthenticated requests", async () => {
    authMock.mockResolvedValue({ userId: null });
    expect(await getUserId()).toBeNull();
    await expect(requireUserId()).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("treats an empty user ID as unauthenticated", async () => {
    authMock.mockResolvedValue({ userId: "" });
    await expect(requireUserId()).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("takes identity only from Clerk context, not from caller-supplied values", async () => {
    const call = requireUserId as (clientSuppliedId?: string) => Promise<string>;
    authMock.mockResolvedValue({ userId: null });
    await expect(call("user_attacker")).rejects.toBeInstanceOf(UnauthenticatedError);
    authMock.mockResolvedValue({ userId: "user_real" });
    expect(await call("user_attacker")).toBe("user_real");
  });
});

describe("authorization primitives", () => {
  const alice = { userId: "user_alice" };
  type Doc = { ownerId: string | null };
  const owner = isOwner<Doc>((d) => d.ownerId);

  it("allows the owner", async () => {
    await expect(authorize(alice, owner, { ownerId: "user_alice" })).resolves.toBeUndefined();
  });

  it("denies a non-owner with ForbiddenError", async () => {
    await expect(authorize(alice, owner, { ownerId: "user_bob" })).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it("denies when the owner is missing", async () => {
    expect(await can(alice, owner, { ownerId: null })).toBe(false);
  });

  it("denies when a rule throws", async () => {
    const broken = () => {
      throw new Error("db down");
    };
    await expect(authorize(alice, broken, undefined)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("only a strict true allows", async () => {
    expect(await can(alice, (() => "yes") as never, undefined)).toBe(false);
  });

  it("composes with anyOf / allOf", async () => {
    const yes = () => true;
    const no = () => false;
    expect(await can(alice, anyOf(no, yes), undefined)).toBe(true);
    expect(await can(alice, anyOf(no, no), undefined)).toBe(false);
    expect(await can(alice, anyOf(), undefined)).toBe(false);
    expect(await can(alice, allOf(yes, yes), undefined)).toBe(true);
    expect(await can(alice, allOf(yes, no), undefined)).toBe(false);
  });
});

describe("error semantics", () => {
  it("are distinct, generic, and leak no detail", () => {
    const u = new UnauthenticatedError();
    const f = new ForbiddenError();
    expect(u.code).toBe("UNAUTHENTICATED");
    expect(f.code).toBe("FORBIDDEN");
    expect(isAuthError(u) && isAuthError(f)).toBe(true);
    expect(isAuthError(new Error("x"))).toBe(false);
    expect(u.message + f.message).not.toMatch(/user_|clerk|secret/i);
  });
});

describe("client/server boundary", () => {
  const read = (f: string) => readFileSync(join(__dirname, f), "utf8");

  it("Clerk server helpers are guarded by server-only", () => {
    expect(read("server.ts")).toMatch(/^import "server-only";/m);
  });

  it("client-safe modules import no Clerk, server-only, env, or db code", () => {
    for (const f of ["errors.ts", "authorize.ts", "index.ts"]) {
      expect(read(f)).not.toMatch(/@clerk|server-only|\.\/server|lib\/env|@\/db|process\.env/);
    }
  });
});
