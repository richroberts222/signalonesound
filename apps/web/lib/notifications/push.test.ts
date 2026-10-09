import { describe, expect, it, vi } from "vitest";

import { createExpoPush, createLoggingPush } from "./push";

// S7 AC8/AC10: the push adapter reports invalid devices so they can be removed, a provider failure is an
// error (never a silent loss), and nothing about a message is logged.
const message = (to: string) => ({ to, title: "Revival Night", body: "Nashville, TN", data: { eventId: "e1" } });

describe("createLoggingPush", () => {
  it("reports delivery without sending, and logs only a count", async () => {
    const lines: string[] = [];
    const push = createLoggingPush((l) => lines.push(l));
    expect(await push.send([message("ExponentPushToken[abc]")])).toEqual([{ to: "ExponentPushToken[abc]", status: "ok" }]);
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toMatch(/ExponentPushToken|Revival Night|Nashville/);
  });
});

describe("createExpoPush", () => {
  it("sends the short message to Expo and maps each ticket to ok, invalid or error", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: [{ status: "ok" }, { status: "error", details: { error: "DeviceNotRegistered" } }, { status: "error", details: { error: "MessageRateExceeded" } }] }),
    }));
    const results = await createExpoPush(fetchImpl).send([message("a"), message("b"), message("c")]);
    expect(results).toEqual([{ to: "a", status: "ok" }, { to: "b", status: "invalid" }, { to: "c", status: "error" }]);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, { body: string }];
    expect(url).toBe("https://exp.host/--/api/v2/push/send");
    const sent = JSON.parse(init.body) as Record<string, unknown>[];
    expect(Object.keys(sent[0]).sort()).toEqual(["body", "data", "sound", "title", "to"]); // nothing else is sent
  });

  it("a failing or malformed provider response is an error for every message, never a silent loss", async () => {
    for (const fetchImpl of [
      vi.fn(async () => { throw new Error("network down"); }),
      vi.fn(async () => ({ ok: false, json: async () => ({}) })),
      vi.fn(async () => ({ ok: true, json: async () => ({ unexpected: true }) })),
    ]) {
      expect(await createExpoPush(fetchImpl).send([message("a"), message("b")])).toEqual([{ to: "a", status: "error" }, { to: "b", status: "error" }]);
    }
  });

  it("sends in batches of 100", async () => {
    const fetchImpl = vi.fn(async (_url: string, init: { body: string }) => ({
      ok: true,
      json: async () => ({ data: (JSON.parse(init.body) as unknown[]).map(() => ({ status: "ok" })) }),
    }));
    const results = await createExpoPush(fetchImpl as never).send(Array.from({ length: 250 }, (_, i) => message(`t${i}`)));
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(results).toHaveLength(250);
    expect(results.every((r) => r.status === "ok")).toBe(true);
  });
});
