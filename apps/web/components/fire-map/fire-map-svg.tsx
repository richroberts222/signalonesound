import type { Fire } from "@signalone/validation";

import usStates from "../../lib/fire-map/data/us-states.json";
import world from "../../lib/fire-map/data/world.json";
import type { Region } from "../../lib/fire-map/geo";
import { GLOW_MILES } from "../../lib/fire-map/geo";
import { outlinePath, pixelsPerMile, project, US_SIZE, WORLD_SIZE, type View } from "../../lib/fire-map/projection";

// The Fire Map drawing (S16): a dark map with silver outlines. Around every fire the darkness lifts: the land
// glows gold, the outline turns gold, and the light fades into the dark. The glow is drawn large so it can be
// seen; the thin ring inside it is the true 10 mile reach that the percentage counts. Drawn on the server as plain
// SVG, so it needs no JavaScript and no map service. Each fire is a link to its event. Nothing moves when the
// visitor prefers reduced motion.
const MIN_GLOW_PX: Record<View, number> = { world: 20, us: 30 };
const HAZE_FACTOR = 2.2;
const LABEL_GAP_PX = 46;
// A flame with a flicker on each side, drawn about the point where it meets the ground (0, 16), with a white-hot core.
const FLAME_OUTER = "M0 -30 C4 -22 12 -16 13 -4 C14 8 8 16 0 16 C-8 16 -14 8 -13 -3 C-12 -9 -8 -12 -7 -19 C-4 -15 -3 -12 -2 -9 C-1 -17 -3 -24 0 -30 Z";
const FLAME_CORE = "M0 -14 C2 -9 7 -6 7 2 C7 9 4 12 0 12 C-4 12 -7 9 -7 3 C-7 -1 -4 -4 -3 -8 C-1 -6 0 -9 0 -14 Z";

export function FireMapSvg({ view, fires }: { view: View; fires: Fire[] }) {
  const regions = (view === "world" ? world : usStates) as Region[];
  const size = view === "world" ? WORLD_SIZE : US_SIZE;
  const outlines = outlinePath(view, regions);
  const placed = fires.map((f) => {
    const p = project(view, f.lat, f.lng);
    const real = GLOW_MILES * pixelsPerMile(view, f.lat);
    return { ...f, ...p, real, glow: Math.max(MIN_GLOW_PX[view], real) };
  });
  // Names are written beside the fires on the United States map, skipping any that would sit on top of another.
  const labeled: typeof placed = [];
  if (view === "us") {
    for (const f of placed) if (labeled.every((l) => Math.hypot(l.x - f.x, l.y - f.y) > LABEL_GAP_PX)) labeled.push(f);
  }
  const id = (name: string) => `fire-${name}-${view}`;
  return (
    <svg
      viewBox={`0 0 ${size.width} ${size.height}`}
      role="group"
      aria-label={view === "world" ? "Map of the world with revival fires" : "Map of the United States with revival fires"}
      data-testid={view === "world" ? "fire-map-world" : "fire-map-us"}
      className="w-full rounded-xl border bg-black"
    >
      <defs>
        <radialGradient id={id("glow")}>
          <stop offset="0" stopColor="#ffd36b" stopOpacity="0.85" />
          <stop offset="0.35" stopColor="#ffc23a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffb02e" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("fade")}>
          <stop offset="0" stopColor="white" stopOpacity="1" />
          <stop offset="0.5" stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id={id("land-light")} maskUnits="userSpaceOnUse" x={0} y={0} width={size.width} height={size.height}>
          {placed.map((f) => (
            <circle key={f.id} cx={f.x} cy={f.y} r={f.glow * HAZE_FACTOR} fill={`url(#${id("fade")})`} />
          ))}
        </mask>
        <mask id={id("outline-light")} maskUnits="userSpaceOnUse" x={0} y={0} width={size.width} height={size.height}>
          {placed.map((f) => (
            <circle key={f.id} cx={f.x} cy={f.y} r={f.glow * 1.3} fill={`url(#${id("fade")})`} />
          ))}
        </mask>
        <path id={id("flame")} d={FLAME_OUTER} />
        <path id={id("flame-core")} d={FLAME_CORE} />
        <linearGradient id={id("flame-body")} x1="0" y1="-30" x2="0" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffd36b" stopOpacity="0.95" />
          <stop offset="0.45" stopColor="#ffac2a" />
          <stop offset="1" stopColor="#e8801a" />
        </linearGradient>
        <filter id={id("flame-crisp")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="0.45" />
        </filter>
        <filter id={id("flame-bloom")} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <filter id={id("flame-core-soft")} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>
      <path d={outlines} className="fill-card" stroke="#9aa0ab" strokeWidth={view === "world" ? 0.6 : 0.8} strokeLinejoin="round" />
      <path d={outlines} fill="#f5c04a" fillOpacity={0.3} mask={`url(#${id("land-light")})`} />
      <g mask={`url(#${id("outline-light")})`}>
        <path d={outlines} fill="none" stroke="#f5c04a" strokeWidth={view === "world" ? 1.4 : 1.8} strokeLinejoin="round" />
      </g>
      {placed.map((f) => (
        <circle key={`glow-${f.id}`} cx={f.x} cy={f.y} r={f.glow * 1.1} fill={`url(#${id("glow")})`} className="motion-safe:animate-pulse" style={{ mixBlendMode: "screen" }} />
      ))}
      {placed.map((f) =>
        f.real >= 1.5 ? <circle key={`ring-${f.id}`} cx={f.x} cy={f.y} r={f.real} fill="none" stroke="#ffd36b" strokeOpacity={0.9} strokeWidth={0.8} /> : null,
      )}
      {placed.map((f, i) => (
        <a key={f.id} href={`/events/${f.id}`} className="group outline-none" data-testid={`fire-${i}`} aria-label={`${f.title}, ${f.place}: open this event`}>
          <title>{`${f.title} (${f.place})`}</title>
          <circle cx={f.x} cy={f.y} r={10} fill="transparent" className="stroke-transparent group-focus-visible:stroke-white" strokeWidth={1.5} />
          <g transform={`translate(${f.x} ${f.y + 4}) scale(0.58)`}>
            <use href={`#${id("flame")}`} fill="#ffb02e" opacity={0.75} filter={`url(#${id("flame-bloom")})`} />
            <use href={`#${id("flame")}`} fill={`url(#${id("flame-body")})`} filter={`url(#${id("flame-crisp")})`} />
            <use href={`#${id("flame-core")}`} fill="#fff0c4" opacity={0.7} filter={`url(#${id("flame-core-soft")})`} />
          </g>
        </a>
      ))}
      {labeled.map((f) => (
        <text
          key={`label-${f.id}`}
          x={f.x + 11}
          y={f.y + 4}
          fontSize={11}
          className="fill-foreground"
          stroke="black"
          strokeWidth={3}
          style={{ paintOrder: "stroke" }}
          aria-hidden
        >
          {f.place.split(",")[0]}
        </text>
      ))}
    </svg>
  );
}
