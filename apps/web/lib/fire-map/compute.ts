import type { FireMap, FireView } from "@signalone/validation";

import usStates from "./data/us-states.json";
import world from "./data/world.json";
import { indexRegions, landAreaSquareMiles, landUnderFireSquareMiles, locate, type Region } from "./geo";

// The Fire Map numbers (S16, docs/features/s16-fire-map.md). Pure: events in, numbers out. The outlines are
// public-domain Natural Earth data (lib/fire-map/data/SOURCES.md), simplified, so the figures are approximate
// and are described that way on the page.

export type MapEvent = { id: string; title: string; lat: number; lng: number };

const worldRegions = indexRegions(world as Region[]);
const usRegions = indexRegions(usStates as Region[]);
const worldLandSquareMiles = landAreaSquareMiles(world as Region[]);
const usLandSquareMiles = landAreaSquareMiles(usStates as Region[]);

function view(events: MapEvent[], regions: typeof worldRegions, landSquareMiles: number): FireView {
  const byRegion = new Map<string, { id: string; title: string }[]>();
  const inside: MapEvent[] = [];
  for (const e of events) {
    const region = locate(regions, e.lat, e.lng);
    if (!region) continue;
    inside.push(e);
    byRegion.set(region.name, [...(byRegion.get(region.name) ?? []), { id: e.id, title: e.title }]);
  }
  const land = landUnderFireSquareMiles(events, regions);
  return {
    fires: inside.length,
    regionsWithFire: byRegion.size,
    regionsTotal: regions.length,
    landPercent: Math.round((land / landSquareMiles) * 100 * 10000) / 10000,
    regions: [...byRegion.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([name, evs]) => ({ name, events: evs })),
  };
}

export function computeFireMap(events: MapEvent[], now: Date): FireMap {
  const usEvents = events.filter((e) => locate(usRegions, e.lat, e.lng));
  return {
    asOf: now.toISOString(),
    fires: events.map((e) => ({ id: e.id, title: e.title, lat: e.lat, lng: e.lng })),
    world: { ...view(events, worldRegions, worldLandSquareMiles), fires: events.length },
    us: view(usEvents, usRegions, usLandSquareMiles),
  };
}
