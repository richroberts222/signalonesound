import type { Region } from "./geo";

// Map projections for the Fire Map page (S16): the world as a plain equirectangular map, and the United States as
// an Albers equal-area map with Alaska and Hawaii drawn smaller in the lower left, as is usual. Pure functions
// that turn longitude and latitude into positions on a drawing of a known size.

export type View = "world" | "us";
export type Point = { x: number; y: number };

export const WORLD_SIZE = { width: 1000, height: 400 };
export const US_SIZE = { width: 960, height: 600 };
const WORLD_TOP = 84;
const WORLD_BOTTOM = -58;

export function projectWorld(lat: number, lng: number): Point {
  return {
    x: ((lng + 180) / 360) * WORLD_SIZE.width,
    y: ((WORLD_TOP - lat) / (WORLD_TOP - WORLD_BOTTOM)) * WORLD_SIZE.height,
  };
}

type Conic = { lat0: number; lng0: number; p1: number; p2: number; scale: number; cx: number; cy: number };
const rad = (d: number) => (d * Math.PI) / 180;

function albers(c: Conic, lat: number, lng: number): Point {
  const n = (Math.sin(rad(c.p1)) + Math.sin(rad(c.p2))) / 2;
  const k = Math.cos(rad(c.p1)) ** 2 + 2 * n * Math.sin(rad(c.p1));
  const rho0 = Math.sqrt(k - 2 * n * Math.sin(rad(c.lat0))) / n;
  const rho = Math.sqrt(k - 2 * n * Math.sin(rad(lat))) / n;
  const theta = n * rad(lng - c.lng0);
  return { x: c.cx + c.scale * rho * Math.sin(theta), y: c.cy - c.scale * (rho0 - rho * Math.cos(theta)) };
}

const SCALE = 1130;
const LOWER_48: Conic = { lat0: 37.5, lng0: -96, p1: 29.5, p2: 45.5, scale: SCALE, cx: 480, cy: 262 };
const ALASKA: Conic = { lat0: 63, lng0: -152, p1: 55, p2: 65, scale: SCALE * 0.3, cx: 160, cy: 505 };
const HAWAII: Conic = { lat0: 20.5, lng0: -157, p1: 8, p2: 18, scale: SCALE * 0.9, cx: 330, cy: 545 };

export function projectUs(lat: number, lng: number): Point {
  const west = lng > 0 ? lng - 360 : lng;
  if (lat >= 51 && west <= -129) return albers(ALASKA, lat, west);
  if (lat <= 29 && west <= -154) return albers(HAWAII, lat, west);
  return albers(LOWER_48, lat, west);
}

export const project = (view: View, lat: number, lng: number): Point => (view === "world" ? projectWorld(lat, lng) : projectUs(lat, lng));

/** Pixels on the drawing that one mile spans, so a fire's light can be drawn to its true size. */
export function pixelsPerMile(view: View, lat: number): number {
  if (view === "world") return WORLD_SIZE.width / 360 / (69.1722 * Math.cos(rad(Math.min(80, Math.abs(lat)))));
  return SCALE / 3958.8;
}

/** SVG path data for the outlines of regions, one decimal place. */
export function outlinePath(view: View, regions: Region[]): string {
  const parts: string[] = [];
  for (const r of regions) {
    for (const poly of r.polygons) {
      for (const ring of poly) {
        const points = ring.map(([lng, lat]) => {
          const p = project(view, lat, lng);
          return `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
        });
        parts.push(`M${points.join("L")}Z`);
      }
    }
  }
  return parts.join("");
}
