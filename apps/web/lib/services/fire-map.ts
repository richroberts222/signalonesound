import type { FireMap } from "@signalone/validation";

import type { EventsRepo } from "../../db/events";
import { computeFireMap } from "../fire-map/compute";

// Service for the public Fire Map (S16, docs/features/s16-fire-map.md). Public: no sign-in, no identity read,
// nothing about the visitor is stored. Framework-free; the repo and the clock are injected.
export type FireMapService = ReturnType<typeof createFireMapService>;

export type FireMapServiceDeps = {
  repo: Pick<EventsRepo, "listMapEvents">;
  now?: () => Date;
};

export function createFireMapService({ repo, now = () => new Date() }: FireMapServiceDeps) {
  return {
    async getFireMap(): Promise<FireMap> {
      const at = now();
      return computeFireMap(await repo.listMapEvents(at), at);
    },
  };
}
