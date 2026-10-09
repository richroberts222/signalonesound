import type { SavedRepo } from "./saved";

// Test-only in-memory stand-in for the saved repo. `events` tells it when each event starts and ends
// (the real repo joins the event table). Never used in application code.
export type EventTimes = { startsAt: Date; endsAt: Date | null };
export type FakeSavedRepo = SavedRepo & {
  rows: () => { userId: string; eventId: string; savedAt: Date }[];
  invites: () => { tokenHash: string; createdBy: string; createdAt: Date; expiresAt: Date; arrivals: number }[];
};

export function createFakeSavedRepo(times: (eventId: string) => EventTimes | undefined, now: () => Date = () => new Date()): FakeSavedRepo {
  const saved: { userId: string; eventId: string; savedAt: Date }[] = [];
  const invites: { tokenHash: string; createdBy: string; createdAt: Date; expiresAt: Date; arrivals: number }[] = [];
  return {
    rows: () => saved.map((r) => ({ ...r })),
    invites: () => invites.map((i) => ({ ...i })),
    async countByUser(userId) {
      return saved.filter((r) => r.userId === userId).length;
    },
    async isSaved(userId, eventId) {
      return saved.some((r) => r.userId === userId && r.eventId === eventId);
    },
    async save(userId, eventId) {
      if (!saved.some((r) => r.userId === userId && r.eventId === eventId)) saved.push({ userId, eventId, savedAt: now() });
    },
    async remove(userId, eventId) {
      const i = saved.findIndex((r) => r.userId === userId && r.eventId === eventId);
      if (i >= 0) saved.splice(i, 1);
    },
    async list(userId, at, cursor, limit) {
      const refs = saved
        .filter((r) => r.userId === userId && times(r.eventId))
        .map((r) => {
          const startsAt = times(r.eventId)!.startsAt;
          return { eventId: r.eventId, savedAt: r.savedAt, startsAt, past: startsAt < at };
        })
        .sort((a, b) => Number(a.past) - Number(b.past) || a.startsAt.getTime() - b.startsAt.getTime() || a.eventId.localeCompare(b.eventId));
      const after = cursor
        ? refs.filter((r) => {
            const a = Number(r.past);
            const b = Number(cursor.past);
            return a > b || (a === b && (r.startsAt > cursor.startsAt || (r.startsAt.getTime() === cursor.startsAt.getTime() && r.eventId > cursor.eventId)));
          })
        : refs;
      return after.slice(0, limit + 1);
    },
    async purgeEnded(cutoff) {
      const before = saved.length;
      for (let i = saved.length - 1; i >= 0; i--) {
        const t = times(saved[i].eventId);
        if (t && (t.endsAt ?? t.startsAt) < cutoff) saved.splice(i, 1);
      }
      return before - saved.length;
    },
    async createInvite(tokenHash, userId, expiresAt) {
      invites.push({ tokenHash, createdBy: userId, createdAt: now(), expiresAt, arrivals: 0 });
    },
    async countInvitesSince(userId, since) {
      return invites.filter((i) => i.createdBy === userId && i.createdAt >= since).length;
    },
    async recordArrival(tokenHash, at) {
      const invite = invites.find((i) => i.tokenHash === tokenHash && i.expiresAt > at);
      if (!invite) return false;
      invite.arrivals += 1;
      return true;
    },
    async purgeExpiredInvites(at) {
      const before = invites.length;
      for (let i = invites.length - 1; i >= 0; i--) if (invites[i].expiresAt < at) invites.splice(i, 1);
      return before - invites.length;
    },
  };
}
