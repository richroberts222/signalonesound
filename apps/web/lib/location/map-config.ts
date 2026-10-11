// Where the location picker's map pictures and place search come from (S17, docs/features/s17-event-location.md).
// Public settings, because the browser asks the map service directly; none of them is a secret. Until the owner
// chooses a plan, they default to OpenStreetMap's own free servers, which are fine at the volume of a few
// organizers placing pins (their usage policy asks for a credit line, which the picker always shows) and give
// no promise of availability, so a dependable service is chosen before launch (docs/to-do.md, docs/features/s17).
// Only the signed-in organizer form uses any of this; the public pages never contact the map service.
export type MapConfig = { tileUrl: string; attribution: string; searchUrl: string; maxZoom: number };

export function mapConfig(): MapConfig {
  return {
    tileUrl: process.env.NEXT_PUBLIC_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: process.env.NEXT_PUBLIC_MAP_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    searchUrl: process.env.NEXT_PUBLIC_MAP_SEARCH_URL || "https://nominatim.openstreetmap.org",
    maxZoom: 19,
  };
}
