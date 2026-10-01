import type { FetchLike } from "@signalone/validation";
import { describe, expect, it, vi } from "vitest";

import { createMobileProofClient, noToken } from "./proofClient";

const ID = "6f1b4d2e-8c3a-4b5d-9e7f-0a1b2c3d4e5f";
const item = { id: ID, label: "from server", createdAt: "2026-01-01T00:00:00.000Z" };

const serverReturning = (payload: unknown) => vi.fn<FetchLike>(async () => ({ json: async () => payload }));

// Mobile consumes the same shared contract/client as web; these tests prove the
// boundary (absolute URL, bearer token, envelope validation) with a fake fetch.
// A live device-to-server run is not possible in CI (docs/mobile.md).
describe("mobile proof client (shared API client)", () => {
  it("calls the absolute API URL with a bearer token and returns validated data", async () => {
    const fetch = serverReturning({ ok: true, data: { items: [item] } });
    const client = createMobileProofClient({
      baseUrl: "http://10.0.2.2:3000",
      getToken: async () => "clerk_session_token",
      fetch,
    });
    expect(await client.list()).toEqual({ ok: true, data: { items: [item] } });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("http://10.0.2.2:3000/api/v1/proof-items");
    expect(init.headers.Authorization).toBe("Bearer clerk_session_token");
  });

  it("surfaces the server's standard error envelope, including field errors", async () => {
    const error = { code: "validation_failed", message: "Invalid input", fieldErrors: { label: ["Label is required"] } };
    const client = createMobileProofClient({ baseUrl: "http://x.test", fetch: serverReturning({ ok: false, error }) });
    expect(await client.create({ label: "" })).toEqual({ ok: false, error });
  });

  it("sends no Authorization header until Clerk is integrated (noToken)", async () => {
    const fetch = serverReturning({ ok: false, error: { code: "unauthenticated", message: "Not signed in" } });
    const client = createMobileProofClient({ baseUrl: "http://x.test", getToken: noToken, fetch });
    const result = await client.list();
    expect(result).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
    expect(fetch.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
});
