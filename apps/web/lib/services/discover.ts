import { utcToLocalString } from "@signalone/shared";
import {
  roundPosition,
  type EventSearchQuery,
  type EventSearchResult,
  type PlaceSearchResult,
  type PublicEvent,
} from "@signalone/validation";

import type { PublicRow, EventsRepo, SearchCursor } from "../../db/events";
import type { AnalyticsPort } from "../observability/ports";
import { noopAnalytics } from "../observability/ports";
import { notFound, validationFailed } from "./errors";

// Service for discovering events (S4, docs/features/s4-discover-web.md). Public: it works for anyone,
// signed in or not, and keeps no record of who searched or what they searched for. The searcher's
// position is rounded to about 1 km before it is used and is never stored; analytics receive only
// the name of the event ("search", "event_view"), never an identifier. Framework-free; the repo, the
// place finder, the analytics port and the clock are injected.

export type PlaceFinder = (query: string, limit?: number) => { label: string; lat: number; lng: number }[];

export type DiscoverServiceDeps = {
  repo: Pick<EventsRepo, "searchPublic" | "getPublic">;
  places: PlaceFinder;
  analytics?: AnalyticsPort;
  now?: () => Date;
};

const encodeCursor = (c: SearchCursor): string =>
  Buffer.from(JSON.stringify({ d: c.distance, s: c.startsAt.toISOString(), i: c.id })).toString("base64url");

function decodeCursor(value: string): SearchCursor {
  try {
    const raw = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { d: number | null; s: string; i: string };
    const startsAt = new Date(raw.s);
    if (Number.isNaN(startsAt.getTime()) || !/^[0-9a-f-]{36}$/.test(raw.i) || (raw.d !== null && typeof raw.d !== "number")) throw new Error("bad cursor");
    return { distance: raw.d, startsAt, id: raw.i };
  } catch {
    throw validationFailed("Invalid cursor");
  }
}

function toPublic(row: PublicRow): PublicEvent {
  return {
    id: row.id,
    organization: { id: row.orgId, name: row.orgName },
    title: row.title,
    description: row.description,
    status: row.status === "cancelled" ? "cancelled" : "published",
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    startLocal: utcToLocalString(row.startsAt, row.timeZone),
    endLocal: row.endsAt ? utcToLocalString(row.endsAt, row.timeZone) : null,
    timeZone: row.timeZone,
    venueName: row.venueName,
    street: row.street,
    city: row.city,
    state: row.state,
    zip: row.zip,
    lat: row.lat,
    lng: row.lng,
    revivalTypes: row.revivalTypes,
    speakers: row.speakers,
    directions: row.directions,
    links: row.links,
    distanceMiles: row.distance,
  };
}

export function createDiscoverService({ repo, places, analytics = noopAnalytics, now = () => new Date() }: DiscoverServiceDeps) {
  return {
    /** Published and cancelled upcoming events: by distance when a position is given, otherwise by start time. */
    async searchEvents(query: EventSearchQuery): Promise<EventSearchResult> {
      const position = query.lat !== undefined && query.lng !== undefined ? { lat: roundPosition(query.lat), lng: roundPosition(query.lng) } : null;
      const rows = await repo.searchPublic({
        now: now(),
        position,
        radius: query.radius === undefined || query.radius === "any" ? null : query.radius,
        from: query.from,
        to: query.to,
        types: query.types,
        organizationId: query.organizationId,
        cursor: query.cursor ? decodeCursor(query.cursor) : null,
        limit: query.limit,
      });
      analytics.count("search");
      const page = rows.slice(0, query.limit);
      const last = page[page.length - 1];
      return {
        items: page.map(toPublic),
        nextCursor: rows.length > query.limit && last ? encodeCursor({ distance: last.distance, startsAt: last.startsAt, id: last.id }) : null,
      };
    },

    /** One event page. A draft, a deleted or held event, or one of an unapproved organization does not exist. */
    async getEvent(id: string): Promise<PublicEvent> {
      const row = await repo.getPublic(id);
      if (!row) throw notFound();
      analytics.count("event_view");
      return toPublic(row);
    },

    /** Turns "Nashville, TN" or a ZIP code into positions, from data shipped with the app. */
    async searchPlaces(q: string): Promise<PlaceSearchResult> {
      return { items: places(q, 5).map((p) => ({ label: p.label, lat: p.lat, lng: p.lng })) };
    },
  };
}

export type DiscoverService = ReturnType<typeof createDiscoverService>;
