import { DatabaseError } from "./errors";
import { utcToLocalString } from "@signalone/shared";

import { DEFAULT_DURATION_MS, type AuditEntry, type EventFull, type EventRow, type EventsRepo, type PublicRow } from "./events";

// Test-only in-memory stand-in for the events repo. It mimics what the service relies on: a create is
// all-or-nothing and a reused key creates nothing, an edit applies only if the version matches (and
// then to every row it names), a status change only from an allowed state, keyset paging by start
// time and id, and an audit entry written with each change. Never used in application code.
export type FakeEventsRepo = EventsRepo & { audit: (AuditEntry & { at: Date })[]; all: () => EventFull[] };

export type OrgInfo = { name: string; status: string };
const miles = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const c = Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng) - rad(a.lng)) + Math.sin(rad(a.lat)) * Math.sin(rad(b.lat));
  return Math.round(3958.8 * Math.acos(Math.min(1, Math.max(-1, c))) * 100) / 100;
};

export function createFakeEventsRepo(
  now: () => Date = () => new Date(),
  orgInfo: (orgId: string) => OrgInfo | undefined = () => ({ name: "Sample Fellowship", status: "approved" }),
): FakeEventsRepo {
  const events = new Map<string, EventFull>();
  const keys: { userId: string; key: string; eventId: string; createdAt: Date }[] = [];
  const audit: (AuditEntry & { at: Date })[] = [];
  const copy = (e: EventFull): EventFull => ({ ...e, revivalTypes: [...e.revivalTypes], links: [...e.links] });
  const byStart = (a: EventRow, b: EventRow) => a.startsAt.getTime() - b.startsAt.getTime() || a.id.localeCompare(b.id);

  return {
    audit,
    all: () => [...events.values()].map(copy),

    async findIdempotent(userId, key, since) {
      return keys.find((k) => k.userId === userId && k.key === key && k.createdAt >= since)?.eventId ?? null;
    },

    async createMany(input) {
      if (keys.some((k) => k.userId === input.userId && k.key === input.idempotencyKey && k.createdAt >= new Date(now().getTime() - 24 * 3600 * 1000))) {
        throw new DatabaseError("unique_violation", "event.createMany", new Error("duplicate key"));
      }
      for (const e of input.events) {
        events.set(e.id, {
          id: e.id,
          orgId: e.orgId,
          seriesId: e.seriesId,
          isException: false,
          title: e.title,
          description: e.description,
          status: e.status,
          moderationState: "published",
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          timeZone: e.timeZone,
          venueName: e.venueName,
          street: e.street,
          city: e.city,
          state: e.state,
          zip: e.zip,
          lat: e.lat,
          lng: e.lng,
          speakers: e.speakers,
          directions: e.directions,
          version: 1,
          editToken: null,
          createdAt: now(),
          updatedAt: now(),
          revivalTypes: [...e.revivalTypes].sort(),
          links: [...e.links],
        });
      }
      keys.push({ userId: input.userId, key: input.idempotencyKey, eventId: input.events[0].id, createdAt: now() });
      audit.push({ ...input.audit, at: now() });
    },

    async getById(id) {
      const e = events.get(id);
      return e ? copy(e) : null;
    },

    async getMany(ids) {
      return ids.flatMap((id) => (events.has(id) ? [copy(events.get(id)!)] : []));
    },

    async listByOrg(orgId, filter, at, cursor, limit) {
      let rows = [...events.values()].filter((e) => e.orgId === orgId && e.status !== "deleted");
      rows =
        filter === "drafts"
          ? rows.filter((e) => e.status === "draft")
          : filter === "past"
            ? rows.filter((e) => e.status !== "draft" && e.startsAt < at)
            : rows.filter((e) => e.status !== "draft" && e.startsAt >= at);
      rows.sort(byStart);
      if (filter === "past") rows.reverse();
      if (cursor) {
        rows = rows.filter((e) =>
          filter === "past"
            ? e.startsAt < cursor.startsAt || (e.startsAt.getTime() === cursor.startsAt.getTime() && e.id < cursor.id)
            : e.startsAt > cursor.startsAt || (e.startsAt.getTime() === cursor.startsAt.getTime() && e.id > cursor.id),
        );
      }
      return rows.slice(0, limit + 1).map(copy);
    },

    async findOverlap(orgId, venueName, startsAt, endsAt, excludeIds) {
      const end = endsAt ?? new Date(startsAt.getTime() + DEFAULT_DURATION_MS);
      const found = [...events.values()].find(
        (e) =>
          e.orgId === orgId &&
          (e.status === "draft" || e.status === "published") &&
          e.venueName.trim().toLowerCase() === venueName.trim().toLowerCase() &&
          !excludeIds.includes(e.id) &&
          e.startsAt < end &&
          (e.endsAt ?? new Date(e.startsAt.getTime() + DEFAULT_DURATION_MS)) > startsAt,
      );
      return found ? { ...found } : null;
    },

    async listSeriesFollowers(seriesId, from) {
      return [...events.values()]
        .filter((e) => e.seriesId === seriesId && !e.isException && e.status !== "deleted" && e.startsAt >= from)
        .sort(byStart)
        .map(copy);
    },

    async applyUpdates(input) {
      const primary = events.get(input.primaryId);
      if (!primary || primary.version !== input.expectedVersion) return false;
      for (const u of input.updates) {
        const row = events.get(u.id);
        if (!row) continue;
        Object.assign(row, Object.fromEntries(Object.entries(u.fields).filter(([, v]) => v !== undefined)));
        if (u.types) row.revivalTypes = [...u.types].sort();
        if (u.links) row.links = [...u.links];
        row.version += 1;
        row.updatedAt = now();
      }
      audit.push({ ...input.audit, at: now() });
      return true;
    },

    async searchPublic(p) {
      const rows: PublicRow[] = [];
      for (const e of events.values()) {
        const org = orgInfo(e.orgId);
        if (!org || org.status !== "approved") continue;
        if (!["published", "cancelled"].includes(e.status) || e.moderationState !== "published" || e.startsAt < p.now) continue;
        let distance: number | null = null;
        if (p.position) {
          if (e.lat === null || e.lng === null) continue;
          distance = miles(p.position, { lat: e.lat, lng: e.lng });
          if (p.radius !== null && distance > p.radius) continue;
        }
        const day = utcToLocalString(e.startsAt, e.timeZone).slice(0, 10);
        if (p.from && day < p.from) continue;
        if (p.to && day > p.to) continue;
        if (p.types.length > 0 && !e.revivalTypes.some((t) => p.types.includes(t))) continue;
        if (p.organizationId && e.orgId !== p.organizationId) continue;
        rows.push({ ...copy(e), orgName: org.name, distance });
      }
      rows.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0) || byStart(a, b));
      const after = p.cursor
        ? rows.filter((r) => {
            const c = p.cursor!;
            if (p.position) {
              const d = r.distance ?? 0;
              const cd = c.distance ?? 0;
              return d > cd || (d === cd && (r.startsAt > c.startsAt || (r.startsAt.getTime() === c.startsAt.getTime() && r.id > c.id)));
            }
            return r.startsAt > c.startsAt || (r.startsAt.getTime() === c.startsAt.getTime() && r.id > c.id);
          })
        : rows;
      return after.slice(0, p.limit + 1);
    },

    async getPublic(id) {
      const e = events.get(id);
      const org = e ? orgInfo(e.orgId) : undefined;
      if (!e || !org || org.status !== "approved" || !["published", "cancelled"].includes(e.status) || e.moderationState !== "published") return null;
      return { ...copy(e), orgName: org.name, distance: null };
    },

    async setStatus(input) {
      const row = events.get(input.id);
      if (!row || !input.from.includes(row.status)) return null;
      row.status = input.to;
      row.version += 1;
      row.updatedAt = now();
      audit.push({ ...input.audit, at: now() });
      return row.version;
    },
  };
}

