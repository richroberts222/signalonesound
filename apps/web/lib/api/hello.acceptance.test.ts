import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { HELLO_NOTE_MAX, helloSchema, resultSchema } from "@signalone/validation";

import { createFakeHelloRepo } from "../../db/hello.fake";
import { createHelloService } from "../services/hello";
import { API_VERSION_HEADER, MAX_BODY_BYTES, createApiRoute } from "./handler";
import { helloRoutes } from "./hello";

// Executable acceptance criteria for S0 (docs/features/s0-walking-skeleton.md), verified at the API
// boundary: real Request -> adapter -> authentication -> validation -> real service -> repo -> Response,
// then read back through the same API. Identity is the only faked boundary (a fake `getUserId`).
//
// AC3  No identity -> 401 on GET and PUT; nothing is read or written.
// AC1/AC2 A signed-in user saves a note and reads it back (the same API serves web and mobile).
// AC4  A user only ever reads and writes their own note; the request cannot name another user.
// AC5  Trimmed, 140 code points, single line, plain text, unknown fields rejected, nothing persisted on failure.
// AC6  Standard envelope, version header, safe errors (no internals), unexpected failures are generic 500.
describe("S0 hello note acceptance criteria (API boundary)", () => {
  const unexpected = vi.fn();
  const url = "http://localhost/api/v1/me/hello";

  const setup = () => {
    const repo = createFakeHelloRepo();
    const as = (userId: string | null, theRepo = repo) => {
      const routes = helloRoutes(createApiRoute({ getUserId: async () => userId, onUnexpected: unexpected }), () =>
        createHelloService({ repo: theRepo }),
      );
      const call = async (pending: Promise<Response>) => {
        const res = await pending;
        return { status: res.status, res, json: (await res.json()) as unknown };
      };
      return {
        get: () => call(routes.GET(new Request(url))),
        put: (body: unknown) => call(routes.PUT(new Request(url, { method: "PUT", body: JSON.stringify(body) }))),
        putRaw: (body: string) => call(routes.PUT(new Request(url, { method: "PUT", body }))),
      };
    };
    return { repo, as };
  };
  type Api = ReturnType<ReturnType<typeof setup>["as"]>;
  const noteOf = async (api: Api) => {
    const parsed = resultSchema(helloSchema).parse((await api.get()).json);
    return parsed.ok ? parsed.data.note : "ERROR";
  };

  it("AC3 unauthenticated callers get 401 on GET and PUT and nothing is written", async () => {
    const { repo, as } = setup();
    for (const r of [await as(null).get(), await as(null).put({ note: "x" }), await as(null).putRaw("{not json")]) {
      expect(r.status).toBe(401);
      expect(r.json).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
    }
    expect(await repo.findByUser("anyone")).toBeNull();
  });

  it("AC1/AC2 a user starts empty, saves a note, and reads it back; saving again replaces it", async () => {
    const { as } = setup();
    const me = as(`user_${randomUUID()}`);
    expect(await noteOf(me)).toBeNull();
    const saved = await me.put({ note: "  Hello from the phone  " });
    expect(saved.status).toBe(200);
    expect(saved.json).toEqual({ ok: true, data: { note: "Hello from the phone" } });
    expect(await noteOf(me)).toBe("Hello from the phone");
    await me.put({ note: "second" });
    expect(await noteOf(me)).toBe("second");
  });

  it("an empty note clears the saved note", async () => {
    const { as } = setup();
    const me = as(`user_${randomUUID()}`);
    await me.put({ note: "something" });
    expect((await me.put({ note: "   " })).json).toEqual({ ok: true, data: { note: null } });
    expect(await noteOf(me)).toBeNull();
  });

  it("AC4 users only ever see and change their own note, even if the body names another user", async () => {
    const { as } = setup();
    const alice = as(`user_${randomUUID()}`);
    const bob = as(`user_${randomUUID()}`);
    await alice.put({ note: "alice note" });
    expect(await noteOf(bob)).toBeNull();
    const attempt = await bob.put({ note: "bob note", userId: "alice" });
    expect(attempt.status).toBe(400); // unknown field rejected
    await bob.put({ note: "bob note" });
    expect(await noteOf(alice)).toBe("alice note");
    expect(await noteOf(bob)).toBe("bob note");
  });

  it("AC5 invalid notes are rejected with 400 and field errors, and nothing is persisted", async () => {
    const { as } = setup();
    const me = as(`user_${randomUUID()}`);
    await me.put({ note: "keep me" });
    const bad: unknown[] = [
      { note: "x".repeat(HELLO_NOTE_MAX + 1) },
      { note: "line one\nline two" },
      { note: "tab\there" },
      { note: 42 },
      { note: null },
      {},
      { note: "ok", extra: true },
      "just a string",
      [],
      null,
    ];
    for (const body of bad) {
      const r = await me.put(body);
      expect(r.status, JSON.stringify(body)).toBe(400);
      expect(r.json).toMatchObject({ ok: false, error: { code: "validation_failed" } });
    }
    expect((await me.putRaw("{not json")).status).toBe(400);
    expect(await noteOf(me)).toBe("keep me");
  });

  it("AC5 a 140-emoji note is accepted and plain-text markup is stored as typed", async () => {
    const { as } = setup();
    const me = as(`user_${randomUUID()}`);
    const emoji = String.fromCodePoint(0x1f525).repeat(HELLO_NOTE_MAX);
    expect((await me.put({ note: emoji })).status).toBe(200);
    expect((await me.put({ note: "<script>alert(1)</script>" })).json).toEqual({
      ok: true,
      data: { note: "<script>alert(1)</script>" },
    });
  });

  it("AC5 an oversized body is rejected before parsing (counted in bytes)", async () => {
    const { as } = setup();
    const me = as(`user_${randomUUID()}`);
    const padded = `{"note":"ok"${" ".repeat(MAX_BODY_BYTES)}}`;
    const r = await me.putRaw(padded);
    expect(r.status).toBe(400);
    expect(await noteOf(me)).toBeNull();
  });

  it("AC6 responses use the standard envelope and version header and never cache", async () => {
    const { as } = setup();
    const r = await as(`user_${randomUUID()}`).get();
    expect(r.res.headers.get(API_VERSION_HEADER)).toBe("v1");
    expect(r.res.headers.get("Cache-Control")).toBe("no-store");
    expect(resultSchema(helloSchema).safeParse(r.json).success).toBe(true);
  });

  it("AC6 unexpected failures are a generic 500 with no internals, reported server-side only", async () => {
    const { repo, as } = setup();
    const broken = {
      ...repo,
      findByUser: async () => {
        throw new Error("secret connection string for the database");
      },
    };
    unexpected.mockClear();
    const r = await as(`user_${randomUUID()}`, broken).get();
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.json)).not.toMatch(/secret|connection|database/);
    expect(unexpected).toHaveBeenCalledTimes(1);
  });
});
