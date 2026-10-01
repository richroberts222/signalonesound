import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PROOF_ITEM_LABEL_MAX,
  proofItemListSchema,
  proofItemSchema,
  resultSchema,
} from "@signalone/validation";

import { DatabaseError } from "../../db/errors";
import type { ProofItemRepo } from "../../db/proof-items";
import { MAX_PROOF_ITEMS_PER_USER, createProofItemService } from "../services/proof-items";
import { API_VERSION_HEADER, createApiRoute } from "./handler";
import { proofItemRoutes } from "./proof-items";

// Executable acceptance criteria for the generic proof feature (Issue 49),
// verified at the API boundary: real Request -> adapter -> authentication ->
// validation -> real service -> the repo supplied by the caller -> Response,
// then read back through the same API. The same suite runs against an in-memory
// repo (default `pnpm test`) and against the real DEV database
// (`pnpm test:integration`). Identity is the only faked boundary (a fake
// `getUserId`; Clerk itself is exercised by Playwright with a dev instance).
//
// AC1  Unauthenticated callers get 401 on every operation and nothing is read or written.
// AC2  Invalid input is rejected with 400 and field errors; nothing is persisted.
// AC3  A valid create returns the public contract (no storage fields) and the item is readable afterwards.
// AC4  Users only ever see their own items.
// AC5  A duplicate label for the same user is a generic 409; another user may reuse the label.
// AC6  The per-user cap is enforced by the service (409).
// AC7  An owner can delete their item; it is gone afterwards.
// AC8  Deleting someone else's item is 403 (item untouched), an unknown id 404, a malformed id 400.
// AC9  Unexpected failures are a generic 500 with no internals, and are reported server-side only.

export type AcceptanceEnv = {
  repo: ProofItemRepo;
  /** Removes everything the given owners created (no-op for in-memory repos). */
  cleanup: (ownerIds: string[]) => Promise<void>;
};

export function proofItemAcceptance(env: () => AcceptanceEnv, options: { skip?: boolean } = {}) {
  const suite = options.skip ? describe.skip : describe;

  suite("proof item acceptance criteria (API boundary)", () => {
    const users: string[] = [];
    const newUser = () => {
      const id = `proof_it_${randomUUID()}`;
      users.push(id);
      return id;
    };
    const unexpected = vi.fn();

    const api = (userId: string | null, repo: ProofItemRepo = env().repo) => {
      const routes = proofItemRoutes(
        createApiRoute({ getUserId: async () => userId, onUnexpected: unexpected }),
        () => createProofItemService({ repo }),
      );
      const url = "http://localhost/api/v1/proof-items";
      const call = async (pending: Promise<Response>) => {
        const res = await pending;
        return { status: res.status, res, json: (await res.json()) as unknown };
      };
      return {
        list: () => call(routes.GET(new Request(url))),
        create: (body: unknown) => call(routes.POST(new Request(url, { method: "POST", body: JSON.stringify(body) }))),
        createRaw: (body: string) => call(routes.POST(new Request(url, { method: "POST", body }))),
        remove: (id: string) => call(routes.DELETE(new Request(`${url}?id=${encodeURIComponent(id)}`, { method: "DELETE" }))),
      };
    };
    const listed = async (userId: string) => {
      const r = await api(userId).list();
      return resultSchema(proofItemListSchema).parse(r.json);
    };
    const labelsOf = async (userId: string) => {
      const r = await listed(userId);
      return r.ok ? r.data.items.map((i) => i.label) : [];
    };
    // Each test uses fresh owner ids and removes what it created, pass or fail.
    afterEach(async () => {
      await env().cleanup(users.splice(0));
    });

    it("AC1 unauthenticated callers get 401 on list, create, and delete", async () => {
      for (const r of [
        await api(null).list(),
        await api(null).create({ label: "x" }),
        await api(null).remove(randomUUID()),
      ]) {
        expect(r.status).toBe(401);
        expect(r.json).toMatchObject({ ok: false, error: { code: "unauthenticated" } });
      }
    });

    it("AC2 invalid input is a 400 with field errors and persists nothing", async () => {
      const user = newUser();
      for (const body of [{ label: "   " }, { label: "x".repeat(PROOF_ITEM_LABEL_MAX + 1) }, {}, { label: 5 }]) {
        const r = await api(user).create(body);
        expect(r.status).toBe(400);
        expect(r.json).toMatchObject({ ok: false, error: { code: "validation_failed" } });
        expect(JSON.stringify(r.json)).toContain("label");
      }
      expect((await api(user).createRaw("{not json")).status).toBe(400);
      expect(await labelsOf(user)).toEqual([]);
    });

    it("AC3 a valid create returns only the public contract and is readable afterwards", async () => {
      const user = newUser();
      const created = await api(user).create({ label: "  first item  " });
      expect(created.status).toBe(200);
      expect(created.res.headers.get(API_VERSION_HEADER)).toBe("v1");
      const body = resultSchema(proofItemSchema).parse(created.json);
      expect(body.ok && Object.keys(body.data).sort()).toEqual(["createdAt", "id", "label"]);
      expect(body.ok && body.data.label).toBe("first item");
      expect(JSON.stringify(created.json)).not.toContain(user); // owner id never leaks

      const after = await listed(user);
      expect(after.ok && after.data.items.map((i) => i.id)).toEqual([body.ok && body.data.id]);
    });

    it("AC4 users only see their own items", async () => {
      const [a, b] = [newUser(), newUser()];
      await api(a).create({ label: "mine" });
      await api(b).create({ label: "theirs" });
      expect(await labelsOf(a)).toEqual(["mine"]);
      expect(await labelsOf(b)).toEqual(["theirs"]);
    });

    it("AC5 duplicate label is a generic 409 for the same user but allowed for another", async () => {
      const [a, b] = [newUser(), newUser()];
      expect((await api(a).create({ label: "dup" })).status).toBe(200);
      const dup = await api(a).create({ label: "dup" });
      expect(dup.status).toBe(409);
      expect(dup.json).toEqual({ ok: false, error: { code: "conflict", message: "Conflict" } });
      expect(await labelsOf(a)).toEqual(["dup"]);
      expect((await api(b).create({ label: "dup" })).status).toBe(200);
    });

    it("AC6 the per-user cap is enforced by the service", async () => {
      const user = newUser();
      for (let i = 0; i < MAX_PROOF_ITEMS_PER_USER; i++) {
        expect((await api(user).create({ label: `item ${i}` })).status).toBe(200);
      }
      const over = await api(user).create({ label: "one too many" });
      expect(over.status).toBe(409);
      expect(over.json).toMatchObject({ ok: false, error: { code: "conflict", message: "Item limit reached" } });
      expect((await labelsOf(user)).length).toBe(MAX_PROOF_ITEMS_PER_USER);
    });

    it("AC7 an owner can delete their item and it is gone afterwards", async () => {
      const user = newUser();
      const created = resultSchema(proofItemSchema).parse((await api(user).create({ label: "temp" })).json);
      if (!created.ok) throw new Error("setup failed");
      const removed = await api(user).remove(created.data.id);
      expect(removed.status).toBe(200);
      expect(removed.json).toEqual({ ok: true, data: { id: created.data.id } });
      expect(await labelsOf(user)).toEqual([]);
    });

    it("AC8 deleting another user's item is 403 and leaves it intact; unknown id 404; malformed id 400", async () => {
      const [owner, other] = [newUser(), newUser()];
      const created = resultSchema(proofItemSchema).parse((await api(owner).create({ label: "keep" })).json);
      if (!created.ok) throw new Error("setup failed");

      const denied = await api(other).remove(created.data.id);
      expect(denied.status).toBe(403);
      expect(denied.json).toMatchObject({ ok: false, error: { code: "forbidden" } });
      expect(await labelsOf(owner)).toEqual(["keep"]);

      expect((await api(owner).remove(randomUUID())).status).toBe(404);
      expect((await api(owner).remove("not-a-uuid")).status).toBe(400);
    });

    it("AC9 unexpected failures are a generic 500, never leak internals, and are reported server-side", async () => {
      const user = newUser();
      const secret = "SELECT * FROM proof_item WHERE password = 'hunter2'";
      const broken = {
        ...env().repo,
        listByOwner: async () => {
          throw new DatabaseError("connection", "proofItem.listByOwner", new Error(secret));
        },
      } as ProofItemRepo;
      unexpected.mockClear();
      const r = await api(user, broken).list();
      expect(r.status).toBe(500);
      expect(r.json).toEqual({ ok: false, error: { code: "internal", message: "Something went wrong" } });
      expect(JSON.stringify(r.json)).not.toMatch(/SELECT|hunter2|proof_item/);
      expect(unexpected).toHaveBeenCalledTimes(1);
    });
  });
}
