import type { EventTimes } from "./saved.fake";
import type { FiresRepo } from "./fires";

// Test-only in-memory stand-in for the fires repo. `times` tells it when each event starts and ends (the real repo
// joins the event table). Never used in application code.
export type FakeFiresRepo = FiresRepo & {
  rows: () => { userId: string; eventId: string; firedAt: Date }[];
  /** The public total for one event, as the events repo would count it. */
  total: (eventId: string) => number;
};

export function createFakeFiresRepo(times: (eventId: string) => EventTimes | undefined, now: () => Date = () => new Date()): FakeFiresRepo {
  const fires: { userId: string; eventId: string; firedAt: Date }[] = [];
  return {
    rows: () => fires.map((r) => ({ ...r })),
    total: (eventId) => fires.filter((r) => r.eventId === eventId).length,
    async isFired(userId, eventId) {
      return fires.some((r) => r.userId === userId && r.eventId === eventId);
    },
    async fire(userId, eventId) {
      if (!fires.some((r) => r.userId === userId && r.eventId === eventId)) fires.push({ userId, eventId, firedAt: now() });
    },
    async unfire(userId, eventId) {
      const i = fires.findIndex((r) => r.userId === userId && r.eventId === eventId);
      if (i >= 0) fires.splice(i, 1);
    },
    async countSince(userId, since) {
      return fires.filter((r) => r.userId === userId && r.firedAt >= since).length;
    },
    async purgeEnded(cutoff) {
      const before = fires.length;
      for (let i = fires.length - 1; i >= 0; i--) {
        const t = times(fires[i].eventId);
        if (t && (t.endsAt ?? t.startsAt) < cutoff) fires.splice(i, 1);
      }
      return before - fires.length;
    },
  };
}
