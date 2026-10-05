"use client";

import type { DiscoverResult, Radius } from "@/lib/discover/filters";
import type { MockOrigin } from "@/lib/discover/types";
import { cn } from "@/lib/utils";

const SIZE = 400;
const C = SIZE / 2;
const MILES_PER_DEG_LAT = 69;

type RevivalMapProps = {
  origin: MockOrigin;
  radius: Radius;
  results: DiscoverResult[];
  selectedId: string | null;
  onSelect: (eventId: string) => void;
  className?: string;
};

/**
 * MOCK map: a schematic SVG (no map tiles, no map SDK, no network) showing the
 * origin, the search radius, and one pin per result. A real interactive GPS map
 * (provider, tiles, clustering) is an undecided architecture choice.
 */
export function RevivalMap({ origin, radius, results, selectedId, onSelect, className }: RevivalMapProps) {
  const farthest = Math.max(0, ...results.map((r) => r.distanceMiles ?? 0));
  const viewMiles = Math.max(8, (radius === "any" ? farthest : radius) * 1.15);
  const pxPerMile = (C - 24) / viewMiles;
  const milesPerDegLng = MILES_PER_DEG_LAT * Math.cos((origin.lat * Math.PI) / 180);

  const project = (lat: number, lng: number) => ({
    x: C + (lng - origin.lng) * milesPerDegLng * pxPerMile,
    y: C - (lat - origin.lat) * MILES_PER_DEG_LAT * pxPerMile,
  });

  const rings = radius === "any" ? [farthest / 3, (farthest * 2) / 3, farthest] : [radius / 2, radius];
  const selected = results.find((r) => r.event.id === selectedId);

  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="group"
        aria-label={`Map of ${results.length} events near ${origin.label}`}
        className="aspect-square w-full rounded-xl border bg-card shadow-glow"
      >
        {[1, 2, 3].map((i) => (
          <g key={i} className="stroke-border" strokeWidth={1}>
            <line x1={(SIZE / 4) * i} x2={(SIZE / 4) * i} y1={0} y2={SIZE} />
            <line y1={(SIZE / 4) * i} y2={(SIZE / 4) * i} x1={0} x2={SIZE} />
          </g>
        ))}

        {rings
          .filter((miles) => miles > 0)
          .map((miles) => (
            <g key={miles}>
              <circle
                cx={C}
                cy={C}
                r={miles * pxPerMile}
                className="fill-primary/5 stroke-primary/40"
                strokeDasharray="4 4"
              />
              <text
                x={C}
                y={C - miles * pxPerMile - 4}
                textAnchor="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {Math.round(miles)} mi
              </text>
            </g>
          ))}

        <g aria-label={`Search center: ${origin.label}`}>
          <rect x={C - 5} y={C - 5} width={10} height={10} rx={2} className="fill-foreground stroke-background" strokeWidth={2} />
          <text x={C} y={C + 20} textAnchor="middle" className="fill-foreground text-[11px] font-medium">
            {origin.label}
          </text>
        </g>

        {results.map(({ event }) => {
          const { x, y } = project(event.venue.lat, event.venue.lng);
          const active = event.id === selectedId;
          return (
            <g
              key={event.id}
              role="button"
              tabIndex={0}
              aria-label={`${event.title}, ${event.venue.city}`}
              aria-pressed={active}
              onClick={() => onSelect(event.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(event.id);
                }
              }}
              className="cursor-pointer outline-none [&:focus-visible>circle:last-of-type]:stroke-ring"
            >
              {/* larger transparent hit area for touch */}
              <circle cx={x} cy={y} r={16} className="fill-transparent" />
              {active ? <circle cx={x} cy={y} r={13} className="fill-primary/35" /> : null}
              <circle
                cx={x}
                cy={y}
                r={active ? 8 : 6}
                className={cn("stroke-background transition-all", active ? "fill-highlight" : "fill-primary/90")}
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        Mock map: schematic only, not real map tiles.
        {selected ? null : results.length ? " Tap a pin to preview an event." : null}
      </figcaption>
    </figure>
  );
}
