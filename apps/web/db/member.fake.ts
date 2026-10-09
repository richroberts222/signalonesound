import { randomUUID } from "node:crypto";

import type { AcceptanceRow, MemberRepo, ProfileRow } from "./member";

// Test-only in-memory stand-in for the member repo. It mimics what the service relies on: one
// profile per Clerk user, acceptance history kept in order, export keyed by table, and erase that
// deletes the profile and unlinks (never deletes) acceptance records. Never used in application code.
export function createFakeMemberRepo(): MemberRepo {
  const profiles = new Map<string, ProfileRow>();
  let acceptances: AcceptanceRow[] = [];
  let tick = 0;
  const copy = <T extends object>(row: T): T => ({ ...row });
  return {
    async findProfile(id) {
      const row = profiles.get(id);
      return row ? copy(row) : null;
    },
    async ensureProfile(id) {
      if (!profiles.has(id)) {
        profiles.set(id, {
          id: randomUUID(),
          clerkUserId: id,
          displayName: null,
          emailPref: false,
          timeZone: null,
          createdAt: new Date(Date.UTC(2026, 0, 1) + tick++ * 1000),
        });
      }
      return copy(profiles.get(id)!);
    },
    async updateProfile(id, patch) {
      const row = profiles.get(id);
      if (!row) return null;
      const next = { ...row, ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) };
      profiles.set(id, next);
      return copy(next);
    },
    async listAcceptances(userId) {
      return acceptances.filter((a) => a.userId === userId).map(copy);
    },
    async recordAcceptances(userId, entries) {
      for (const e of entries) {
        acceptances.push({
          id: randomUUID(),
          userId,
          policyKind: e.policyKind,
          version: e.version,
          acceptedAt: new Date(Date.UTC(2026, 0, 1) + tick++ * 1000),
        });
      }
    },
    async exportAll(userId) {
      const profile = profiles.get(userId);
      return {
        user_profile: profile ? [copy(profile)] : [],
        policy_acceptance: acceptances.filter((a) => a.userId === userId).map(copy),
        proof_item: [],
      };
    },
    async eraseAll(userId) {
      profiles.delete(userId);
      acceptances = acceptances.map((a) => (a.userId === userId ? { ...a, userId: `deleted:${randomUUID()}` } : a));
    },
  };
}
