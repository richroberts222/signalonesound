import type { Fire } from "@signalone/validation";

import usStates from "../../lib/fire-map/data/us-states.json";
import world from "../../lib/fire-map/data/world.json";
import type { Region } from "../../lib/fire-map/geo";
import { GLOW_MILES } from "../../lib/fire-map/geo";
import { outlinePath, pixelsPerMile, project, US_SIZE, WORLD_SIZE, type View } from "../../lib/fire-map/projection";

// The Fire Map drawing (S16): a dark map with silver outlines; where a fire's light falls, the darkness lifts and
// the outline turns gold. Drawn on the server as plain SVG, so it needs no JavaScript and no map service. Each
// fire is a link to its event. Nothing moves when the visitor prefers reduced motion.
const MIN_GLOW_PX: Record<View, number> = { world: 18, us: 26 };

export function FireMapSvg({ view, fires }: { view: View; fires: Fire[] }) {
  const regions = (view === "world" ? world : usStates) as Region[];
  const size = view === "world" ? WORLD_SIZE : US_SIZE;
  const outlines = outlinePath(view, regions);
  const placed = fires.map((f) => {
    const p = project(view, f.lat, f.lng);
    const glow = Math.max(MIN_GLOW_PX[view], GLOW_MILES * pixelsPerMile(view, f.lat));
    return { ...f, ...p, glow };
  });
  const clipId = `fire-light-${view}`;
  const glowId = `fire-glow-${view}`;
  return (
    <svg
      viewBox={`0 0 ${size.width} ${size.height}`}
      role="group"
      aria-label={view === "world" ? "Map of the world with revival fires" : "Map of the United States with revival fires"}
      data-testid={view === "world" ? "fire-map-world" : "fire-map-us"}
      className="w-full rounded-xl border bg-black"
    >
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0" stopColor="#ffb02e" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#ff6d1f" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ff3b1d" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${clipId}-fade`}>
          <stop offset="0" stopColor="white" stopOpacity="1" />
          <stop offset="0.55" stopColor="white" stopOpacity="0.7" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={clipId} maskUnits="userSpaceOnUse" x={0} y={0} width={size.width} height={size.height}>
          {placed.map((f) => (
            <circle key={f.id} cx={f.x} cy={f.y} r={f.glow} fill={`url(#${clipId}-fade)`} />
          ))}
        </mask>
      </defs>
      <path d={outlines} fill="none" stroke="#9aa0ab" strokeWidth={view === "world" ? 0.6 : 0.8} strokeLinejoin="round" />
      <g mask={`url(#${clipId})`}>
        <path d={outlines} fill="none" stroke="#f5c04a" strokeWidth={view === "world" ? 1.4 : 1.8} strokeLinejoin="round" />
      </g>
      {placed.map((f) => (
        <circle key={`glow-${f.id}`} cx={f.x} cy={f.y} r={f.glow} fill={`url(#${glowId})`} className="motion-safe:animate-pulse" />
      ))}
      {placed.map((f, i) => (
        <a key={f.id} href={`/events/${f.id}`} className="group outline-none" data-testid={`fire-${i}`} aria-label={`${f.title}: open this event`}>
          <title>{f.title}</title>
          <circle cx={f.x} cy={f.y} r={9} fill="transparent" className="stroke-transparent group-focus-visible:stroke-white" strokeWidth={1.5} />
          <path
            transform={`translate(${f.x} ${f.y}) scale(0.9)`}
            d="M0 -8 C2 -5 5 -3 5 1 C5 5 2.5 7 0 7 C-2.5 7 -5 5 -5 1 C-5 -1 -3 -3 -2 -5 C-1 -3 0 -4 0 -8 Z"
            fill="#ffd36b"
            stroke="#ff6d1f"
            strokeWidth={1}
          />
        </a>
      ))}
    </svg>
  );
}
