"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { glowRadius, MAX_ZOOM, MIN_ZOOM, panBy, viewBox, wholeMap, zoomBy, ZOOM_STEP, type Camera } from "@/lib/fire-map/zoom";

// The Fire Map drawing (S16, S16b): a dark map with silver outlines. Around every fire the darkness lifts: the land
// glows gold, the outline turns gold, and the light fades into the dark. The glow is drawn large so it can be
// seen; the thin ring inside it is the true 10 mile reach that the percentage counts. Zooming in shrinks each glow
// toward its true size. The server draws the first picture, so the map shows without JavaScript; this adds zoom.
// Each fire is a link to its event. Nothing moves when the visitor prefers reduced motion.
export type PlacedFire = { id: string; title: string; place: string; x: number; y: number; real: number };
type View = "world" | "us";

const MIN_GLOW_PX: Record<View, number> = { world: 20, us: 30 };
const HAZE_FACTOR = 2.2;
const LABEL_GAP_PX = 46;
const DRAG_START_PX = 4;
// A flame with a flicker on each side, drawn about the point where it meets the ground (0, 16), with a soft core.
const FLAME_OUTER = "M0 -30 C4 -22 12 -16 13 -4 C14 8 8 16 0 16 C-8 16 -14 8 -13 -3 C-12 -9 -8 -12 -7 -19 C-4 -15 -3 -12 -2 -9 C-1 -17 -3 -24 0 -30 Z";
const FLAME_CORE = "M0 -14 C2 -9 7 -6 7 2 C7 9 4 12 0 12 C-4 12 -7 9 -7 3 C-7 -1 -4 -4 -3 -8 C-1 -6 0 -9 0 -14 Z";

type Props = { view: View; size: { width: number; height: number }; outlines: string; stateLines: string; fires: PlacedFire[] };

export function FireMapCanvas({ view, size, outlines, stateLines, fires }: Props) {
  const [cam, setCam] = useState<Camera>(() => wholeMap(size));
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragging = useRef(false);
  const pinchDistance = useRef(0);
  const start = useRef({ x: 0, y: 0 });

  // Screen sizes stay steady as the map zooms: everything drawn "in pixels" is multiplied by k.
  const k = 1 / cam.zoom;
  const placed = fires.map((f) => ({ ...f, glow: glowRadius(f.real, MIN_GLOW_PX[view], cam.zoom) }));
  // Names are written beside the fires on the United States map, skipping any that would sit on top of another.
  // Zooming in leaves room for more of them.
  const labeled: typeof placed = [];
  if (view === "us") {
    for (const f of placed) if (labeled.every((l) => Math.hypot(l.x - f.x, l.y - f.y) > LABEL_GAP_PX * k)) labeled.push(f);
  }

  const zoomButton = (factor: number) => setCam((c) => zoomBy(size, c, factor));

  // The wheel zooms only with Ctrl or Command held (a trackpad pinch sends this too), so scrolling the page past the map still works.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const fx = (e.clientX - rect.left) / rect.width;
      const fy = (e.clientY - rect.top) / rect.height;
      setCam((c) => zoomBy(size, c, Math.exp(-e.deltaY * 0.0025), fx, fy));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [size]);

  const onPointerDown = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      dragging.current = false;
      start.current = { x: e.clientX, y: e.clientY };
    } else {
      pinchDistance.current = 0;
    }
  };

  const onPointerMove = (e: PointerEvent<SVGSVGElement>) => {
    const el = svgRef.current;
    const before = pointers.current.get(e.pointerId);
    if (!el || !before) return;
    const rect = el.getBoundingClientRect();
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance.current > 0 && distance > 0) {
        const fx = ((a.x + b.x) / 2 - rect.left) / rect.width;
        const fy = ((a.y + b.y) / 2 - rect.top) / rect.height;
        setCam((c) => zoomBy(size, c, distance / pinchDistance.current, fx, fy));
      }
      pinchDistance.current = distance;
      dragging.current = true;
      return;
    }
    // One finger or the mouse: a drag begins only after a small movement, so a plain tap still opens a fire.
    if (!dragging.current) {
      if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) < DRAG_START_PX) return;
      dragging.current = true;
      el.setPointerCapture(e.pointerId);
    }
    const unitsPerPixel = size.width / cam.zoom / rect.width;
    setCam((c) => panBy(size, c, -(e.clientX - before.x) * unitsPerPixel, -(e.clientY - before.y) * unitsPerPixel));
  };

  const onPointerEnd = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    pinchDistance.current = 0;
    if (pointers.current.size === 0) dragging.current = false;
  };

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.target !== e.currentTarget) return;
    const step = (size.width / cam.zoom) * 0.15;
    if (e.key === "+" || e.key === "=") zoomButton(ZOOM_STEP);
    else if (e.key === "-") zoomButton(1 / ZOOM_STEP);
    else if (e.key === "0") setCam(wholeMap(size));
    else if (e.key === "ArrowLeft") setCam((c) => panBy(size, c, -step, 0));
    else if (e.key === "ArrowRight") setCam((c) => panBy(size, c, step, 0));
    else if (e.key === "ArrowUp") setCam((c) => panBy(size, c, 0, -step));
    else if (e.key === "ArrowDown") setCam((c) => panBy(size, c, 0, step));
    else return;
    e.preventDefault();
  };

  const id = (name: string) => `fire-${name}-${view}`;
  const zoomed = cam.zoom > MIN_ZOOM;
  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={viewBox(size, cam)}
        role="group"
        tabIndex={0}
        aria-label={`${view === "world" ? "Map of the world" : "Map of the United States"} with revival fires. Use plus and minus to zoom and the arrow keys to move.`}
        data-testid={view === "world" ? "fire-map-world" : "fire-map-us"}
        className={`w-full rounded-xl border bg-black ${zoomed ? "cursor-grab active:cursor-grabbing" : ""}`}
        style={{ touchAction: zoomed ? "none" : "pan-y" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
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
        <path d={outlines} className="fill-card" stroke="#9aa0ab" strokeWidth={(view === "world" ? 0.6 : 0.8) * k} strokeLinejoin="round" />
        {stateLines && <path d={stateLines} fill="none" stroke="#9aa0ab" strokeWidth={0.35 * k} strokeLinejoin="round" />}
        <path d={outlines} fill="#f5c04a" fillOpacity={0.3} mask={`url(#${id("land-light")})`} />
        <g mask={`url(#${id("outline-light")})`}>
          <path d={outlines} fill="none" stroke="#f5c04a" strokeWidth={(view === "world" ? 1.4 : 1.8) * k} strokeLinejoin="round" />
        </g>
        {placed.map((f) => (
          <circle key={`glow-${f.id}`} cx={f.x} cy={f.y} r={f.glow * 1.1} fill={`url(#${id("glow")})`} className="motion-safe:animate-pulse" style={{ mixBlendMode: "screen" }} />
        ))}
        {placed.map((f) =>
          f.real * cam.zoom >= 1.5 ? <circle key={`ring-${f.id}`} cx={f.x} cy={f.y} r={f.real} fill="none" stroke="#ffd36b" strokeOpacity={0.9} strokeWidth={0.8 * k} /> : null,
        )}
        {placed.map((f, i) => (
          <a key={f.id} href={`/events/${f.id}`} className="group outline-none" data-testid={`fire-${i}`} aria-label={`${f.title}, ${f.place}: open this event`}>
            <title>{`${f.title} (${f.place})`}</title>
            <circle cx={f.x} cy={f.y} r={10 * k} fill="transparent" className="stroke-transparent group-focus-visible:stroke-white" strokeWidth={1.5 * k} />
            <g transform={`translate(${f.x} ${f.y + 4 * k}) scale(${0.58 * k})`}>
              <use href={`#${id("flame")}`} fill="#ffb02e" opacity={0.75} filter={`url(#${id("flame-bloom")})`} />
              <use href={`#${id("flame")}`} fill={`url(#${id("flame-body")})`} filter={`url(#${id("flame-crisp")})`} />
              <use href={`#${id("flame-core")}`} fill="#fff0c4" opacity={0.7} filter={`url(#${id("flame-core-soft")})`} />
            </g>
          </a>
        ))}
        {labeled.map((f) => (
          <text
            key={`label-${f.id}`}
            x={f.x + 11 * k}
            y={f.y + 4 * k}
            fontSize={11 * k}
            className="fill-foreground"
            stroke="black"
            strokeWidth={3 * k}
            style={{ paintOrder: "stroke" }}
            aria-hidden
          >
            {f.place.split(",")[0]}
          </text>
        ))}
      </svg>
      <div className="absolute top-2 right-2 flex flex-col gap-1">
        <Button type="button" size="icon" variant="secondary" aria-label="Zoom in" data-testid={`fire-map-zoom-in-${view}`} disabled={cam.zoom >= MAX_ZOOM} onClick={() => zoomButton(ZOOM_STEP)}>
          <Plus aria-hidden />
        </Button>
        <Button type="button" size="icon" variant="secondary" aria-label="Zoom out" data-testid={`fire-map-zoom-out-${view}`} disabled={cam.zoom <= MIN_ZOOM} onClick={() => zoomButton(1 / ZOOM_STEP)}>
          <Minus aria-hidden />
        </Button>
        <Button type="button" size="icon" variant="secondary" aria-label="Reset the map" data-testid={`fire-map-zoom-reset-${view}`} disabled={!zoomed} onClick={() => setCam(wholeMap(size))}>
          <RotateCcw aria-hidden />
        </Button>
      </div>
    </div>
  );
}
