import { findMockOrigin } from "./mock-data";
import { isRevivalTypeId, type RevivalTypeId } from "./revival-types";
import type { MockEvent, MockOrigin } from "./types";

// Presentation/interaction logic for the Discover Revival mock. Real search
// semantics (matching, ranking, radius "X") belong to the later API/service
// design, not to this file.

/** Product plan A1: 10, 25, 50, X, or unlimited miles. "X" is UNDECIDED and not offered. */
export const RADIUS_OPTIONS = [10, 25, 50, "any"] as const;
export type Radius = (typeof RADIUS_OPTIONS)[number];
export const DEFAULT_RADIUS: Radius = 25;

export const DATE_PRESETS = [
  { id: "any", label: "Any date" },
  { id: "today", label: "Today" },
  { id: "weekend", label: "This weekend" },
  { id: "week", label: "Next 7 days" },
  { id: "month", label: "Next 30 days" },
] as const;
export type DatePreset = (typeof DATE_PRESETS)[number]["id"];
/** A preset, or one specific day as YYYY-MM-DD. */
export type DateFilter = DatePreset | (string & {});

export type DiscoverFilters = {
  /** Mock origin id; null until the user taps "Near Me". */
  near: string | null;
  radius: Radius;
  date: DateFilter;
  /** Revival Types; an event matches when it carries at least one (OR). */
  types: RevivalTypeId[];
};

export const DEFAULT_FILTERS: DiscoverFilters = {
  near: null,
  radius: DEFAULT_RADIUS,
  date: "any",
  types: [],
};

export type DiscoverResult = { event: MockEvent; distanceMiles: number | null };

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const isPreset = (v: string): v is DatePreset => DATE_PRESETS.some((p) => p.id === v);

// ---- URL <-> filters (so Back from Event Details restores the search) ----

export function parseFilters(params: { get(name: string): string | null }): DiscoverFilters {
  const near = findMockOrigin(params.get("near"))?.id ?? null;
  const radiusRaw = params.get("radius");
  const radius =
    RADIUS_OPTIONS.find((r) => String(r) === radiusRaw) ?? DEFAULT_RADIUS;
  const dateRaw = params.get("date") ?? "any";
  const date: DateFilter = isPreset(dateRaw) || YMD.test(dateRaw) ? dateRaw : "any";
  const types = (params.get("types") ?? "")
    .split(",")
    .filter(isRevivalTypeId)
    .filter((t, i, all) => all.indexOf(t) === i);
  return { near, radius, date, types };
}

/** Query string (without "?") with defaults omitted. */
export function filtersToQuery(filters: DiscoverFilters): string {
  const p = new URLSearchParams();
  if (filters.near) p.set("near", filters.near);
  if (filters.radius !== DEFAULT_RADIUS) p.set("radius", String(filters.radius));
  if (filters.date !== "any") p.set("date", filters.date);
  if (filters.types.length) p.set("types", filters.types.join(","));
  return p.toString();
}

// ---- dates (local calendar dates as YYYY-MM-DD; no time zones in the mock) ----

const toUtc = (ymd: string) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};

export function addDays(ymd: string, days: number): string {
  return new Date(toUtc(ymd) + days * 86_400_000).toISOString().slice(0, 10);
}

/** Inclusive [start, end] a filter covers; end is null when open-ended. */
export function dateRange(filter: DateFilter, today: string): { start: string; end: string | null } {
  switch (filter) {
    case "any":
      return { start: today, end: null };
    case "today":
      return { start: today, end: today };
    case "week":
      return { start: today, end: addDays(today, 6) };
    case "month":
      return { start: today, end: addDays(today, 29) };
    case "weekend": {
      const dow = new Date(toUtc(today)).getUTCDay(); // 0 = Sunday
      if (dow === 0) return { start: today, end: today };
      if (dow === 6) return { start: today, end: addDays(today, 1) };
      const friday = addDays(today, 5 - dow);
      return { start: friday, end: addDays(friday, 2) };
    }
    default:
      return { start: filter, end: filter };
  }
}

// ---- distance and filtering ----

export function distanceMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 3958.8; // Earth radius in miles
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function filterEvents(
  events: MockEvent[],
  filters: DiscoverFilters,
  origin: MockOrigin | undefined,
  today: string,
): DiscoverResult[] {
  const { start, end } = dateRange(filters.date, today);
  return events
    .filter((e) => {
      const last = e.endDate ?? e.date;
      if (last < start) return false; // already over, or outside the chosen window
      if (end !== null && e.date > end) return false;
      if (filters.types.length && !e.revivalTypes.some((t) => filters.types.includes(t))) {
        return false;
      }
      return true;
    })
    .map((event) => ({
      event,
      distanceMiles: origin ? distanceMiles(origin, event.venue) : null,
    }))
    .filter(
      (r) =>
        r.distanceMiles === null || filters.radius === "any" || r.distanceMiles <= filters.radius,
    )
    .sort(
      (a, b) =>
        a.event.date.localeCompare(b.event.date) ||
        a.event.startTime.localeCompare(b.event.startTime) ||
        (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0),
    );
}
