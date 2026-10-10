import { randomUUID } from "node:crypto";

import type { ContactRepo, ContactRow } from "./contact";

// In-memory contact repo that behaves like the real one: newest first, a per-address daily limit checked
// and recorded together, status changes and deletes by id.
export function createFakeContactRepo(now: () => Date = () => new Date()): ContactRepo & { readonly rows: ContactRow[] } {
  const rows: ContactRow[] = [];
  return {
    rows,
    createLimited: async (input, max, since) => {
      if (rows.filter((r) => r.addressKey === input.addressKey && r.createdAt.getTime() >= since.getTime()).length >= max) return false;
      rows.push({ id: randomUUID(), status: "new", createdAt: now(), ...input });
      return true;
    },
    list: async (status) => rows.filter((r) => status === "all" || r.status === status).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    setStatus: async (id, status) => {
      const row = rows.find((r) => r.id === id);
      if (!row) return null;
      row.status = status;
      return row;
    },
    remove: async (id) => {
      const i = rows.findIndex((r) => r.id === id);
      if (i < 0) return false;
      rows.splice(i, 1);
      return true;
    },
  };
}
