// Pure geometry for the Fire Map (S16, docs/features/s16-fire-map.md): no framework, no network, no clock.
// Outlines are lists of polygons; a polygon is an outer ring followed by hole rings of [longitude, latitude].

export type Ring = [number, number][];
export type Polygon = Ring[];
export type Region = { name: string; code: string; polygons: Polygon[] };

export const GLOW_MILES = 10;
const EARTH_RADIUS_MILES = 3958.8;
const MILES_PER_DEGREE_LAT = 69.0934;
const MILES_PER_DEGREE_LNG_AT_EQUATOR = 69.1722;

type Box = { minLng: number; maxLng: number; minLat: number; maxLat: number };
type IndexedPolygon = { rings: Polygon; box: Box };
type IndexedRegion = Region & { indexed: IndexedPolygon[] };

function boxOf(outer: Ring): Box {
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
  for (const [lng, lat] of outer) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return { minLng, maxLng, minLat, maxLat };
}

function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Prepares regions so that finding the region of a point skips polygons whose bounding box misses it. */
export function indexRegions(regions: Region[]): IndexedRegion[] {
  return regions.map((r) => ({ ...r, indexed: r.polygons.map((rings) => ({ rings, box: boxOf(rings[0]) })) }));
}

/** The region whose outline contains the point, or null (for example the open ocean). */
export function locate(regions: IndexedRegion[], lat: number, lng: number): IndexedRegion | null {
  for (const r of regions) {
    for (const p of r.indexed) {
      if (lng < p.box.minLng || lng > p.box.maxLng || lat < p.box.minLat || lat > p.box.maxLat) continue;
      if (!inRing(lng, lat, p.rings[0])) continue;
      if (p.rings.slice(1).some((hole) => inRing(lng, lat, hole))) continue;
      return r;
    }
  }
  return null;
}

/** Great-circle distance in miles. */
export function miles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

function ringArea(ring: Ring): number {
  // Spherical polygon area (Chamberlain and Duquette), in square miles; the sign depends on winding.
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += ((x2 - x1) * Math.PI) / 180 * (2 + Math.sin((y1 * Math.PI) / 180) + Math.sin((y2 * Math.PI) / 180));
  }
  return Math.abs((sum * EARTH_RADIUS_MILES * EARTH_RADIUS_MILES) / 2);
}

/** Land area of the regions in square miles (outer rings minus holes). */
export function landAreaSquareMiles(regions: Region[]): number {
  let total = 0;
  for (const r of regions) for (const poly of r.polygons) total += ringArea(poly[0]) - poly.slice(1).reduce((n, h) => n + ringArea(h), 0);
  return total;
}

/**
 * Land within GLOW_MILES of at least one fire, in square miles. Each fire is sampled on a one mile grid; a grid
 * cell shared by several fires is counted once, and only cells that fall inside the outlines count as land.
 */
export function landUnderFireSquareMiles(fires: { lat: number; lng: number }[], regions: IndexedRegion[]): number {
  const seen = new Set<string>();
  let count = 0;
  let last: IndexedRegion | null = null;
  const reach = Math.floor(GLOW_MILES);
  for (const f of fires) {
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -reach; dx <= reach; dx++) {
        if (dx * dx + dy * dy > GLOW_MILES * GLOW_MILES) continue;
        const lat = f.lat + dy / MILES_PER_DEGREE_LAT;
        if (lat > 90 || lat < -90) continue;
        const milesPerLng = MILES_PER_DEGREE_LNG_AT_EQUATOR * Math.cos((lat * Math.PI) / 180);
        if (milesPerLng < 0.5) continue;
        const lng = f.lng + dx / milesPerLng;
        const row = Math.round(lat * MILES_PER_DEGREE_LAT);
        const col = Math.round((lng * MILES_PER_DEGREE_LNG_AT_EQUATOR * Math.cos((row / MILES_PER_DEGREE_LAT) * (Math.PI / 180))));
        const key = `${row}:${col}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (last && locate([last], lat, lng)) {
          count++;
          continue;
        }
        const hit = locate(regions, lat, lng);
        if (hit) {
          last = hit;
          count++;
        }
      }
    }
  }
  return count;
}
