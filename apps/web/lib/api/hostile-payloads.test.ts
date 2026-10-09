import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createApiRoute } from "./handler";

// Hostile-payload suite for the API adapter (docs/secure-coding.md, OWASP API Security Top 10).
// Modern attacks arrive as API requests with crafted bodies and query strings. Every payload below
// must end in the standard response envelope: never a crash (500), never an echo of the attacker's
// input, never a changed prototype, and the service must not run for input that is not valid.
const serviceCalls = vi.fn();
const unexpected = vi.fn();
const schema = z.object({ id: z.string().min(1).max(40), label: z.string().min(1).max(20) });

const bodyRoute = createApiRoute({ getUserId: async () => "user_1", onUnexpected: unexpected })({
  auth: "required",
  input: { schema },
  handle: async (_ctx, input) => {
    serviceCalls(input);
    return { id: input.id, label: input.label };
  },
});
const queryRoute = createApiRoute({ getUserId: async () => "user_1", onUnexpected: unexpected })({
  auth: "required",
  input: { schema, source: "query" },
  handle: async (_ctx, input) => {
    serviceCalls(input);
    return { id: input.id, label: input.label };
  },
});

const post = (body: string, contentType = "application/json") =>
  new Request("http://localhost/api/v1/items", { method: "POST", body, headers: { "content-type": contentType } });

type Case = { name: string; body: string; contentType?: string; status: 200 | 400; marker?: string };
const deep = (n: number) => "[".repeat(n) + "]".repeat(n);

const cases: Case[] = [
  { name: "malformed JSON", body: "{not json", status: 400 },
  { name: "malformed JSON carrying a script is not echoed back", body: '{"id":"<script>x', status: 400, marker: "<script>" },
  { name: "empty body", body: "", status: 400 },
  { name: "JSON null", body: "null", status: 400 },
  { name: "array instead of object", body: "[1,2,3]", status: 400 },
  { name: "bare string", body: '"just a string"', status: 400 },
  { name: "bare number", body: "123", status: 400 },
  { name: "missing required field", body: '{"id":"a"}', status: 400 },
  { name: "numbers where strings belong", body: '{"id":1,"label":2}', status: 400 },
  { name: "object where a string belongs", body: '{"id":{"$ne":null},"label":"b"}', status: 400, marker: "$ne" },
  { name: "array where a string belongs", body: '{"id":["a"],"label":"b"}', status: 400 },
  { name: "nesting bomb (very deep arrays)", body: deep(50000), status: 400 },
  { name: "huge array within the size cap", body: "[" + "0,".repeat(40000) + "0]", status: 400 },
  { name: "single very long string", body: JSON.stringify({ id: "a", label: "x".repeat(90000) }), status: 400 },
  { name: "script payload in a value that is too long", body: JSON.stringify({ id: "a", label: "<script>alert(1)</script>".repeat(5) }), status: 400, marker: "<script>" },
  { name: "byte-order mark before the JSON is tolerated (the platform strips it)", body: '\uFEFF{"id":"a","label":"b"}', status: 200 },
  { name: "form-encoded body sent as JSON", body: "id=a&label=b", contentType: "application/x-www-form-urlencoded", status: 400 },
  { name: "SQL-looking text is plain data", body: JSON.stringify({ id: "a'; DROP TABLE x;--", label: "b" }), status: 200 },
  { name: "unknown extra fields are stripped (mass assignment)", body: '{"id":"a","label":"b","isAdmin":true,"ownerId":"user_2"}', status: 200 },
  { name: "duplicate keys: the last one wins and nothing breaks", body: '{"id":"a","id":"b","label":"c"}', status: 200 },
  { name: "emoji and right-to-left text", body: JSON.stringify({ id: "a", label: "\u{1F600}\u202Ebc" }), status: 200 },
];

const NO_ECHO_MARKERS = ["SQL", "stack", "at Object", "node_modules", "ECONN"];

describe("hostile payloads against the API adapter", () => {
  it.each(cases)("$name", async ({ body, contentType, status, marker }) => {
    serviceCalls.mockClear();
    unexpected.mockClear();
    const res = await bodyRoute(post(body, contentType));
    const text = await res.text();

    expect(res.status).toBe(status);
    expect(res.status).not.toBe(500);
    expect(unexpected).not.toHaveBeenCalled();
    const parsed = JSON.parse(text) as { ok: boolean; error?: { code: string } };
    expect(typeof parsed.ok).toBe("boolean");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    if (status === 400) {
      expect(serviceCalls).not.toHaveBeenCalled();
      expect(parsed.ok).toBe(false);
      expect(parsed.error?.code).toBe("validation_failed");
      if (marker) expect(text).not.toContain(marker);
    }
    for (const leak of NO_ECHO_MARKERS) expect(text).not.toContain(leak === "SQL" ? "SQLSTATE" : leak);
  });

  it("does not pass unknown fields to the service", async () => {
    serviceCalls.mockClear();
    await bodyRoute(post('{"id":"a","label":"b","isAdmin":true,"ownerId":"user_2"}'));
    expect(serviceCalls).toHaveBeenCalledWith({ id: "a", label: "b" });
  });

  it("does not let prototype-pollution keys change object prototypes", async () => {
    for (const body of [
      '{"id":"a","label":"b","__proto__":{"polluted":true}}',
      '{"__proto__":{"polluted":true},"id":"a","label":"b"}',
      '{"id":"a","label":"b","constructor":{"prototype":{"polluted":true}}}',
    ]) {
      await bodyRoute(post(body));
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
      expect(Object.prototype.hasOwnProperty.call(Object.prototype, "polluted")).toBe(false);
    }
  });

  it("handles hostile query strings on query-source routes", async () => {
    const hostile = [
      "?id=a&label=b&__proto__[polluted]=1",
      "?id[]=a&id=b&label=c",
      "?id=" + encodeURIComponent("a'; DROP TABLE x;--") + "&label=b",
      "?id=a&label=" + "x".repeat(5000),
      "?id=%00&label=b",
      "?id=a&label=b&label=c",
    ];
    for (const q of hostile) {
      const res = await queryRoute(new Request("http://localhost/api/v1/items" + q));
      expect([200, 400]).toContain(res.status);
      expect(JSON.parse(await res.text()).ok).toBeTypeOf("boolean");
      expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    }
    expect(unexpected).not.toHaveBeenCalled();
  });

  it("answers an unauthenticated hostile request with 401 before reading the input", async () => {
    const anonymous = createApiRoute({ getUserId: async () => null, onUnexpected: unexpected })({
      auth: "required",
      input: { schema },
      handle: async () => ({ ok: true }),
    });
    for (const body of [deep(50000), "x".repeat(200000), '{"__proto__":{"polluted":true}}']) {
      const res = await anonymous(post(body));
      expect(res.status).toBe(401);
    }
  });
});
