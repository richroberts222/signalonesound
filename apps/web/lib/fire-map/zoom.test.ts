import { describe, expect, it } from "vitest";

import { clampCamera, glowRadius, MAX_ZOOM, MIN_ZOOM, panBy, viewBox, wholeMap, zoomBy, ZOOM_STEP } from "./zoom";

const size = { width: 1000, height: 400 };

describe("zoom", () => {
  it("starts on the whole map", () => {
    expect(viewBox(size, wholeMap(size))).toBe("0 0 1000 400");
  });

  it("zooms in one step and shrinks the window", () => {
    const cam = zoomBy(size, wholeMap(size), ZOOM_STEP);
    expect(cam.zoom).toBeCloseTo(ZOOM_STEP);
    expect(viewBox(size, cam)).toBe(`${(1000 - 1000 / ZOOM_STEP) / 2} ${(400 - 400 / ZOOM_STEP) / 2} ${1000 / ZOOM_STEP} ${400 / ZOOM_STEP}`);
  });

  it("never zooms out past the whole map or in past the maximum", () => {
    expect(zoomBy(size, wholeMap(size), 0.1).zoom).toBe(MIN_ZOOM);
    expect(zoomBy(size, wholeMap(size), 1000).zoom).toBe(MAX_ZOOM);
  });

  it("keeps the spot under the pointer still while zooming", () => {
    const start = wholeMap(size);
    // The spot a quarter of the way across and down the whole map: (250, 100).
    const cam = zoomBy(size, start, 4, 0.25, 0.25);
    const left = cam.cx - 1000 / cam.zoom / 2;
    const top = cam.cy - 400 / cam.zoom / 2;
    expect(left + 0.25 * (1000 / cam.zoom)).toBeCloseTo(250);
    expect(top + 0.25 * (400 / cam.zoom)).toBeCloseTo(100);
  });

  it("cannot be dragged off the map", () => {
    const zoomed = zoomBy(size, wholeMap(size), 4);
    const far = panBy(size, zoomed, 99999, -99999);
    const [x, y, w, h] = viewBox(size, far).split(" ").map(Number);
    expect(x + w).toBeLessThanOrEqual(1000);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(clampCamera(size, { zoom: 4, cx: -50, cy: 9999 }).cx).toBe(1000 / 4 / 2);
    expect(h).toBeCloseTo(100);
  });

  it("the whole map cannot be moved at all", () => {
    expect(panBy(size, wholeMap(size), 300, 300)).toEqual(wholeMap(size));
  });
});

describe("glow size", () => {
  it("is unchanged at the whole-map view", () => {
    expect(glowRadius(0.4, 20, 1)).toBe(20);
    expect(glowRadius(35, 20, 1)).toBe(35);
  });

  it("shrinks as you zoom in", () => {
    expect(glowRadius(0.4, 20, 4)).toBeLessThan(glowRadius(0.4, 20, 1));
  });

  it("never shrinks below the true reach", () => {
    for (const zoom of [1, 2, 6, MAX_ZOOM]) expect(glowRadius(3, 20, zoom)).toBeGreaterThanOrEqual(3);
    expect(glowRadius(3, 20, MAX_ZOOM)).toBe(3);
  });
});
