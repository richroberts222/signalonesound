// Distances on the earth's surface. One formula everywhere (the database search uses the same one),
// rounded to hundredths of a mile, so "within 10 miles" means the same in a search, an alert and a test.
export type Position = { lat: number; lng: number };

const EARTH_RADIUS_MILES = 3958.8;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** Great-circle distance in miles, rounded to two decimals. */
export function milesBetween(a: Position, b: Position): number {
  const cosine =
    Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.cos(radians(b.lng) - radians(a.lng)) +
    Math.sin(radians(a.lat)) * Math.sin(radians(b.lat));
  return Math.round(EARTH_RADIUS_MILES * Math.acos(Math.min(1, Math.max(-1, cosine))) * 100) / 100;
}
