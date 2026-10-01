import { describe, expect, it, vi } from "vitest";

import { createApiClient, createProofItemClient, type FetchLike } from "./api-client";
import {
  PROOF_ITEM_LABEL_MAX,
  createProofItemSchema,
  deleteProofItemQuerySchema,
  proofItemSchema,
} from "./proof-item";

const ID = "6f1b4d2e-8c3a-4b5d-9e7f-0a1b2c3d4e5f";
const item = { id: ID, label: "hello", createdAt: "2026-01-01T00:00:00.000Z" };

describe("proof item contracts", () => {
  it("trims labels and enforces length boundaries", () => {
    expect(createProofItemSchema.parse({ label: "  hi  " })).toEqual({ label: "hi" });
    expect(createProofItemSchema.safeParse({ label: "   " }).success).toBe(false);
    expect(createProofItemSchema.safeParse({ label: "x".repeat(PROOF_ITEM_LABEL_MAX) }).success).toBe(true);
    expect(createProofItemSchema.safeParse({ label: "x".repeat(PROOF_ITEM_LABEL_MAX + 1) }).success).toBe(false);
    expect(createProofItemSchema.safeParse({}).success).toBe(false);
  });

  it("requires a uuid for deletion and rejects database-shaped extras in the public item", () => {
    expect(deleteProofItemQuerySchema.safeParse({ id: "nope" }).success).toBe(false);
    expect(deleteProofItemQuerySchema.safeParse({ id: ID }).success).toBe(true);
    expect(Object.keys(proofItemSchema.parse({ ...item, ownerId: "user_1" })).sort()).toEqual([
      "createdAt",
      "id",
      "label",
    ]);
  });
});

const jsonFetch = (payload: unknown) =>
  vi.fn<FetchLike>(async () => ({ json: async () => payload }));

describe("shared API client", () => {
  it("returns validated data on success and sends a bearer token only when provided", async () => {
    const fetch = jsonFetch({ ok: true, data: { items: [item] } });
    const client = createProofItemClient(
      createApiClient({ baseUrl: "https://api.example.test/", getToken: async () => "tok", fetch }),
    );
    expect(await client.list()).toEqual({ ok: true, data: { items: [item] } });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.example.test/api/v1/proof-items");
    expect(init.headers.Authorization).toBe("Bearer tok");

    const web = jsonFetch({ ok: true, data: item });
    await createProofItemClient(createApiClient({ baseUrl: "", fetch: web })).create({ label: "hello" });
    expect(web.mock.calls[0][0]).toBe("/api/v1/proof-items");
    expect(web.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(web.mock.calls[0][1].body).toBe(JSON.stringify({ label: "hello" }));
  });

  it("passes server errors through the shared envelope", async () => {
    const error = { code: "unauthenticated", message: "Not signed in" };
    const client = createProofItemClient(
      createApiClient({ baseUrl: "", fetch: jsonFetch({ ok: false, error }) }),
    );
    expect(await client.list()).toEqual({ ok: false, error });
  });

  it("encodes the id as a query parameter for deletion", async () => {
    const fetch = jsonFetch({ ok: true, data: { id: ID } });
    await createProofItemClient(createApiClient({ baseUrl: "", fetch })).remove(ID);
    expect(fetch.mock.calls[0][0]).toBe(`/api/v1/proof-items?id=${ID}`);
    expect(fetch.mock.calls[0][1].method).toBe("DELETE");
  });

  it("never throws: network failure and contract violations become a generic internal error", async () => {
    const down = vi.fn<FetchLike>(async () => {
      throw new Error("ECONNREFUSED 10.0.0.1");
    });
    const bad = jsonFetch({ ok: true, data: { items: [{ id: 1 }] } });
    for (const fetch of [down, bad]) {
      const r = await createProofItemClient(createApiClient({ baseUrl: "", fetch })).list();
      expect(r).toEqual({ ok: false, error: { code: "internal", message: "Something went wrong" } });
    }
  });
});
