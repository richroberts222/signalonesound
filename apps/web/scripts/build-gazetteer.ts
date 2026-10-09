// Builds apps/web/data/gazetteer.json from the US Census Bureau gazetteer files (public domain):
//   2024_Gaz_zcta_national.txt   ZIP code areas with a central point
//   2024_Gaz_place_national.txt  cities, towns and other places with a central point
// Download and unzip both from https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html
// into one folder, then:  pnpm --filter web exec tsx scripts/build-gazetteer.ts <folder>
// The output is committed; the raw files are not. Coordinates are rounded to 3 decimals (about 110 m).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { placeKeys } from "../lib/places/place-name";

const dir = process.argv[2];
if (!dir) throw new Error("usage: tsx scripts/build-gazetteer.ts <folder with the two Census text files>");

const round = (n: number) => Math.round(n * 1000) / 1000;
const rows = (file: string): Record<string, string>[] => {
  const [head, ...lines] = readFileSync(join(dir, file), "utf8").split(/\r?\n/).filter((l) => l.trim() !== "");
  const names = head.split("\t").map((h) => h.trim());
  return lines.map((line) => Object.fromEntries(line.split("\t").map((v, i) => [names[i], v.trim()])));
};

const zip: Record<string, [number, number]> = {};
for (const r of rows("2024_Gaz_zcta_national.txt")) {
  const lat = Number(r.INTPTLAT);
  const lng = Number(r.INTPTLONG);
  if (/^\d{5}$/.test(r.GEOID) && Number.isFinite(lat) && Number.isFinite(lng)) zip[r.GEOID] = [round(lat), round(lng)];
}

// [state, key, lat, lng, land area in square miles]; the largest place wins when names collide.
const places: [string, string, number, number, number][] = [];
for (const r of rows("2024_Gaz_place_national.txt")) {
  const lat = Number(r.INTPTLAT);
  const lng = Number(r.INTPTLONG);
  if (!/^[A-Z]{2}$/.test(r.USPS) || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
  for (const key of placeKeys(r.NAME)) places.push([r.USPS, key, round(lat), round(lng), Math.round(Number(r.ALAND_SQMI) * 10) / 10]);
}

const out = join(import.meta.dirname, "..", "data", "gazetteer.json");
// Stored as two compact strings (not nested objects) so the type checker and the loader stay fast:
//   zip:    "00601,18.181,-66.75|00602,..."          ZIP, latitude, longitude
//   places: "AL,abanda,33.092,-85.528,3|..."         state, name key, latitude, longitude, land area
writeFileSync(
  out,
  JSON.stringify({
    source: "US Census Bureau 2024 Gazetteer (public domain)",
    zip: Object.entries(zip).map(([z, [lat, lng]]) => `${z},${lat},${lng}`).join("|"),
    places: places.map((row) => row.join(",")).join("|"),
  }),
);
console.log(`gazetteer: ${Object.keys(zip).length} ZIP areas, ${places.length} place names -> ${out}`);
