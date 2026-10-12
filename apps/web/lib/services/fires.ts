import { FIRE_RETENTION_DAYS, MAX_FIRES_PER_DAY, type FireResult } from "@signalone/validation";

import type { EventsRepo } from "../../db/events";
import type { FiresRepo } from "../../db/fires";
import type { ServiceContext } from "./context";
import { notFound, rateLimited } from "./errors";

// Service for fires (S19, docs/features/s19-fire-recommend.md). A fire links a person to a church event, which is
// sensitive, so: every read and write is scoped to the authenticated caller and nothing here can tell anyone who gave
// a fire. The public total is part of the event itself. Framework-free; the repos and the clock are injected.

export type FiresServiceDeps = {
  repo: FiresRepo;
  events: Pick<EventsRepo, "getPublic">;
  requireAccepted: (userId: string) => Promise<void>;
  now?: () => Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function createFiresService({ repo, events, requireAccepted, now = () => new Date() }: FiresServiceDeps) {
  return {
    /** Whether the caller has given this event a fire (for the button). */
    async isFired(ctx: ServiceContext, eventId: string): Promise<FireResult> {
      return { eventId, fired: await repo.isFired(ctx.actor.userId, eventId) };
    },

    /** Gives a public event a fire. Giving one twice is the same as once, and does not count against the daily limit. */
    async fire(ctx: ServiceContext, eventId: string): Promise<FireResult> {
      await requireAccepted(ctx.actor.userId);
      if (!(await events.getPublic(eventId))) throw notFound(); // drafts, deleted, held and not-approved events cannot be fired
      if (await repo.isFired(ctx.actor.userId, eventId)) return { eventId, fired: true };
      if ((await repo.countSince(ctx.actor.userId, new Date(now().getTime() - DAY_MS))) >= MAX_FIRES_PER_DAY) throw rateLimited();
      await repo.fire(ctx.actor.userId, eventId);
      return { eventId, fired: true };
    },

    /** Takes a fire back. Taking back one that was not given succeeds quietly. */
    async unfire(ctx: ServiceContext, eventId: string): Promise<FireResult> {
      await repo.unfire(ctx.actor.userId, eventId);
      return { eventId, fired: false };
    },

    /** The retention job: fires on events that ended 30 days ago. */
    async purge(): Promise<{ firesRemoved: number }> {
      return { firesRemoved: await repo.purgeEnded(new Date(now().getTime() - FIRE_RETENTION_DAYS * DAY_MS)) };
    },
  };
}

export type FiresService = ReturnType<typeof createFiresService>;
