import type { Fire } from "@signalone/validation";

import usStates from "../../lib/fire-map/data/us-states.json";
import world from "../../lib/fire-map/data/world.json";
import type { Region } from "../../lib/fire-map/geo";
import { GLOW_MILES } from "../../lib/fire-map/geo";
import { outlinePath, pixelsPerMile, project, US_SIZE, WORLD_SIZE, type View } from "../../lib/fire-map/projection";
import { FireMapCanvas } from "./fire-map-canvas";

// The Fire Map drawing (S16): the server turns outlines and fires into positions on the drawing and the canvas
// draws them, so the map is in the page without JavaScript. The canvas adds zoom and pan (S16b).
export function FireMapSvg({ view, fires }: { view: View; fires: Fire[] }) {
  const regions = (view === "world" ? world : usStates) as Region[];
  const size = view === "world" ? WORLD_SIZE : US_SIZE;
  const placed = fires.map((f) => {
    const p = project(view, f.lat, f.lng);
    return { id: f.id, title: f.title, place: f.place, x: p.x, y: p.y, real: GLOW_MILES * pixelsPerMile(view, f.lat) };
  });
  // The world map draws the United States as one country; its state borders are added as faint lines (drawing only, the counts still use countries).
  const stateLines = view === "world" ? outlinePath("world", usStates as Region[]) : "";
  return <FireMapCanvas view={view} size={size} outlines={outlinePath(view, regions)} stateLines={stateLines} fires={placed} />;
}
