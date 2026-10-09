import { DatabaseError } from "./errors";
import { DEFAULT_DURATION_MS, type AuditEntry, type EventFull, type EventRow, type EventsRepo } from "./events";

// Test-only in-memory stand-in for the events repo. It mimics what the service relies on: a create is
// all-or-nothing and a reused key creates nothing, an edit applies only if the version matches (and
// then to every row it names), a status change only from an allowed state, keyset paging by start
// time and id, and an audit entry written with each change. Never used in application code.
export type FakeEventsRepo = EventsRepo & { audit: (AuditEntry & { at: Date })[]; all: () => EventFull[] };

export function createFakeEventsRepo(now: () => Date = () => new Date()): FakeEventsRepo {
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

