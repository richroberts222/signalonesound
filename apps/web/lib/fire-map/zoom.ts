// Zoom and pan for the Fire Map (S16b, docs/features/s16-fire-map.md). Pure functions: a camera is how far the
// map is zoomed in and where the middle of the visible window sits, in drawing units. Nothing here touches the page.

export type Size = { width: number; height: number };
export type Camera = { zoom: number; cx: number; cy: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 12;
export const ZOOM_STEP = 1.6;

export const wholeMap = (size: Size): Camera => ({ zoom: MIN_ZOOM, cx: size.width / 2, cy: size.height / 2 });

/** Keeps the zoom in range and the visible window inside the map, so the map can never be dragged off the page. */
export function clampCamera(size: Size, cam: Camera): Camera {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.zoom));
  const halfW = size.width / zoom / 2;
  const halfH = size.height / zoom / 2;
  return {
    zoom,
    cx: Math.min(size.width - halfW, Math.max(halfW, cam.cx)),
    cy: Math.min(size.height - halfH, Math.max(halfH, cam.cy)),
  };
}

/**
 * Zooms by a factor while keeping one spot still. The spot is given as a fraction of the visible window
 * (0 to 1 across and down); the middle of the window is (0.5, 0.5).
 */
export function zoomBy(size: Size, cam: Camera, factor: number, fx = 0.5, fy = 0.5): Camera {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, cam.zoom * factor));
  const spotX = cam.cx + (fx - 0.5) * (size.width / cam.zoom);
  const spotY = cam.cy + (fy - 0.5) * (size.height / cam.zoom);
  return clampCamera(size, { zoom, cx: spotX + (0.5 - fx) * (size.width / zoom), cy: spotY + (0.5 - fy) * (size.height / zoom) });
}

/** Moves the window by an amount in drawing units. */
export const panBy = (size: Size, cam: Camera, dx: number, dy: number): Camera => clampCamera(size, { ...cam, cx: cam.cx + dx, cy: cam.cy + dy });

/** The SVG viewBox for a camera. */
export function viewBox(size: Size, cam: Camera): string {
  const w = size.width / cam.zoom;
  const h = size.height / cam.zoom;
  return `${round(cam.cx - w / 2)} ${round(cam.cy - h / 2)} ${round(w)} ${round(h)}`;
}

/**
 * The radius to draw a fire's light, in drawing units. On screen it is never smaller than the minimum visible size
 * at the whole-map view, and it is never smaller than the true reach, so zooming in shrinks the glow toward the
 * true 10 mile size and no further. At zoom 1 this is exactly the old size.
 */
export const glowRadius = (trueRadius: number, minVisible: number, zoom: number): number => Math.max(minVisible / zoom, trueRadius);

const round = (n: number) => Math.round(n * 100) / 100;
