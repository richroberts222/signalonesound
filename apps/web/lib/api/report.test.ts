import { describe, expect, it, vi } from "vitest";

import { DatabaseError } from "../../db/errors";
import { createApiRoute } from "./handler";
import { reportUnexpectedError } from "./report";

describe("reportUnexpectedError", () => {
  it("records only the error class and database operation/kind, never message, cause, or stack", () => {
    const write = vi.fn();
    const error = new DatabaseError("connection", "proofItem.insert", new Error("postgres://user:pw@host/db"));
    reportUnexpectedError(error, write);
    const line = write.mock.calls[0][0] as string;
    expect(JSON.parse(line)).toEqual({
      event: "api.unexpected_error",
      errorName: "DatabaseError",
      dbOperation: "proofItem.insert",
      dbKind: "connection",
    });
    expect(line).not.toMatch(/postgres|pw|host|at /);
  });

  it("handles non-Error values and a failing sink without throwing", () => {
    expect(() =>
      reportUnexpectedError("boom password=x", () => {
        throw new Error("sink down");
      }),
    ).not.toThrow();
    const write = vi.fn();
    reportUnexpectedError("boom password=x", write);
    expect(write.mock.calls[0][0]).not.toContain("password");
  });
});

describe("API adapter wiring of the reporting hook", () => {
  it("reports an unexpected service failure once and answers with a generic 500", async () => {
    const lines: string[] = [];
    const route = createApiRoute({
      getUserId: async () => "user_1",
      onUnexpected: (e) => reportUnexpectedError(e, (l) => lines.push(l)),
    })({
      auth: "required",
      handle: async () => {
        throw new DatabaseError("unknown", "x.op", new Error("SELECT 1"));
      },
    });
    const res = await route(new Request("http://localhost/api/v1/x"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: { code: "internal", message: "Something went wrong" } });
    expect(lines).toHaveLength(1);
  });

  it("reports a failing identity provider and does not report expected failures", async () => {
    const onUnexpected = vi.fn();
    const failingAuth = createApiRoute({
      getUserId: async () => {
        throw new Error("clerk down");
      },
      onUnexpected,
    })({ auth: "required", handle: async () => 1 });
    expect((await failingAuth(new Request("http://localhost/x"))).status).toBe(500);
    expect(onUnexpected).toHaveBeenCalledTimes(1);

    onUnexpected.mockClear();
    const unauth = createApiRoute({ getUserId: async () => null, onUnexpected })({
      auth: "required",
      handle: async () => 1,
    });
    expect((await unauth(new Request("http://localhost/x"))).status).toBe(401);
    expect(onUnexpected).not.toHaveBeenCalled();
  });

  it("still reports (and stays generic) when the response cannot be serialized", async () => {
    const onUnexpected = vi.fn();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const route = createApiRoute({ getUserId: async () => "u", onUnexpected })({
      auth: "required",
      handle: async () => circular,
    });
    const res = await route(new Request("http://localhost/x"));
    expect(res.status).toBe(500);
    expect(onUnexpected).toHaveBeenCalledTimes(1);
  });
});
