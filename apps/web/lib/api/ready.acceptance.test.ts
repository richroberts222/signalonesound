import { describe, expect, it, vi } from "vitest";

import { createReadyService } from "../services/ready";
import { createApiRoute } from "./handler";
import { readyRoutes } from "./ready";

// Executable acceptance criteria for the readiness check (docs/features/s9-launch-gate.md, AC6), verified at the API
// boundary: real Request -> adapter -> real service -> Response. Nobody is signed in: an uptime monitor calls it.
//
// R1 Public: 200 and "ready" when the database answers.  R2 A failing database is 503 "unavailable" and the cause
// never reaches the caller.  R3 A database that hangs is 503 within the timeout.  R4 It recovers by itself.
// R5 Never cached, and it carries the API version header.
type Json = { ok: boolean; data?: { status: string }; error?: { code: string; message: string } };

describe("readiness acceptance criteria (API boundary)", () => {
  const setup = (ping: () => Promise<void>, timeoutMs?: number) => {
    const getUserId = vi.fn(async () => null);
    const onUnexpected = vi.fn();
    const service = createReadyService({ ping, timeoutMs });
    const routes = readyRoutes(createApiRoute({ getUserId, onUnexpected }), () => service);
    const get = async () => {
      const res = await routes.get.GET(new Request("http://localhost/api/v1/ready"));
      return { status: res.status, headers: res.headers, json: (await res.json()) as Json };
    };
    return { get, getUserId, onUnexpected };
  };

  it("R1 is public and answers 200 'ready' when the database answers", async () => {
    const s = setup(async () => {});
    const r = await s.get();
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ ok: true, data: { status: "ready" } });
    expect(s.getUserId).not.toHaveBeenCalled(); // no sign-in is looked at
  });

  it("R2 a failing database is 503 'unavailable' with a fixed message, and the cause never reaches the caller", async () => {
    const secret = "connection refused: password authentication failed for user admin at host db.internal.example";
    const s = setup(async () => {
      throw new Error(secret);
    });
    const r = await s.get();
    expect(r.status).toBe(503);
    expect(r.json).toEqual({ ok: false, error: { code: "unavailable", message: "The service is not ready" } });
    expect(JSON.stringify(r.json)).not.toContain("password");
    expect(JSON.stringify(r.json)).not.toContain("db.internal");
    expect(s.onUnexpected).not.toHaveBeenCalled();
  });

  it("R3 a database that never answers is 503 once the timeout passes, and the wait is not left running", async () => {
    vi.useFakeTimers();
    try {
      const s = setup(() => new Promise<void>(() => {}), 3000);
      const pending = s.get();
      await vi.advanceTimersByTimeAsync(2999);
      let settled = false;
      void pending.then(() => (settled = true));
      await vi.advanceTimersByTimeAsync(0);
      expect(settled).toBe(false); // still waiting just before the timeout
      await vi.advanceTimersByTimeAsync(2);
      const r = await pending;
      expect(r.status).toBe(503);
      expect(r.json.error?.code).toBe("unavailable");
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("R3 a quick answer leaves no timer behind", async () => {
    vi.useFakeTimers();
    try {
      const s = setup(async () => {});
      await s.get();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("R4 it recovers by itself: a failure is not remembered", async () => {
    let healthy = false;
    const s = setup(async () => {
      if (!healthy) throw new Error("down");
    });
    expect((await s.get()).status).toBe(503);
    healthy = true;
    expect((await s.get()).status).toBe(200);
    healthy = false;
    expect((await s.get()).status).toBe(503);
  });

  it("R5 answers are never cached and carry the API version", async () => {
    for (const ping of [async () => {}, async () => { throw new Error("down"); }]) {
      const r = await setup(ping).get();
      expect(r.headers.get("Cache-Control")).toBe("no-store");
      expect(r.headers.get("X-API-Version")).toBeTruthy();
    }
  });
});
