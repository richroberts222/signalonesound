import type { HelloNoteRow, HelloRepo } from "./hello";

// Test-only in-memory stand-in for the hello repo: one row per user, replaced on
// write. Never used in application code.
export function createFakeHelloRepo(): HelloRepo {
  const rows = new Map<string, HelloNoteRow>();
  return {
    async findByUser(userId) {
      const row = rows.get(userId);
      return row ? { ...row } : null;
    },
    async upsert(userId, note) {
      const row: HelloNoteRow = { userId, note, updatedAt: new Date() };
      rows.set(userId, row);
      return { ...row };
    },
    async deleteByUser(userId) {
      return rows.delete(userId);
    },
  };
}
