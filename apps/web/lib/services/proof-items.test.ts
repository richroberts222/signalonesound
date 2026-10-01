import { describe, expect, it, vi } from "vitest";

import { createFakeProofItemRepo } from "../../db/proof-items.fake";
import { runService } from "./run";
import { createServiceContext } from "./context";
import { MAX_PROOF_ITEMS_PER_USER, createProofItemService } from "./proof-items";

const a = createServiceContext("user_a");
const b = createServiceContext("user_b");

describe("proof item service (fake repo)", () => {
  it("maps rows to the public contract", async () => {
    const svc = createProofItemService({ repo: createFakeProofItemRepo() });
    const created = await svc.create(a, { label: "x" });
    expect(Object.keys(created).sort()).toEqual(["createdAt", "id", "label"]);
    expect(await svc.list(a)).toEqual({ items: [created] });
  });

  it("scopes lists and ownership to the actor from the context", async () => {
    const svc = createProofItemService({ repo: createFakeProofItemRepo() });
    await svc.create(a, { label: "mine" });
    expect((await svc.list(b)).items).toEqual([]);
  });

  it("enforces the per-user cap at the boundary value", async () => {
    const svc = createProofItemService({ repo: createFakeProofItemRepo() });
    for (let i = 0; i < MAX_PROOF_ITEMS_PER_USER; i++) await svc.create(a, { label: `l${i}` });
    const r = await runService(() => svc.create(a, { label: "over" }));
    expect(r).toMatchObject({ ok: false, error: { code: "conflict", message: "Item limit reached" } });
    expect((await runService(() => svc.create(b, { label: "over" }))).ok).toBe(true);
  });

  it("maps duplicate labels to a generic conflict via the repo's unique violation", async () => {
    const svc = createProofItemService({ repo: createFakeProofItemRepo() });
    await svc.create(a, { label: "dup" });
    expect(await runService(() => svc.create(a, { label: "dup" }))).toEqual({
      ok: false,
      error: { code: "conflict", message: "Conflict" },
    });
  });

  it("remove: not_found when missing, forbidden for non-owners, and no delete is attempted when denied", async () => {
    const repo = createFakeProofItemRepo();
    const deleteOwned = vi.spyOn(repo, "deleteOwned");
    const svc = createProofItemService({ repo });
    const { id } = await svc.create(a, { label: "x" });
    expect(await runService(() => svc.remove(b, { id }))).toMatchObject({ ok: false, error: { code: "forbidden" } });
    expect(deleteOwned).not.toHaveBeenCalled();
    expect(await runService(() => svc.remove(a, { id: "00000000-0000-4000-8000-000000000000" }))).toMatchObject({
      ok: false,
      error: { code: "not_found" },
    });
    expect(await runService(() => svc.remove(a, { id }))).toEqual({ ok: true, data: { id } });
  });

  it("remove: a delete that matches nothing (lost race) is not_found", async () => {
    const repo = createFakeProofItemRepo();
    const svc = createProofItemService({ repo });
    const { id } = await svc.create(a, { label: "x" });
    vi.spyOn(repo, "deleteOwned").mockResolvedValue(false);
    expect(await runService(() => svc.remove(a, { id }))).toMatchObject({ ok: false, error: { code: "not_found" } });
  });
});
