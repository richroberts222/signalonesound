import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, gte, inArray, lt, ne, notInArray, or, sql } from "drizzle-orm";

import type { Database } from "./client";
import { withDbErrors } from "./errors";
import { auditLog, event, eventLink, eventRevivalType, eventSeries, idempotencyRecord } from "./schema";

// Data access for events (S3, docs/features/s3-events-church-portal.md). Server-only by convention
// (like all of db/): it owns the Drizzle queries and DatabaseError wrapping and returns its own row
// types that the service maps to the public contract. Multi-step writes use one atomic batch (the
// driver has no interactive transactions, docs/database.md section 18). Edits stamp the row with a
// random token and every dependent statement runs only if the token matches, so an edit that lost
// the version race changes nothing at all.
export type EventRow = typeof event.$inferSelect;
export type EventFull = EventRow & { revivalTypes: string[]; links: string[] };
export type AuditEntry = { actorId: string; action: string; subject: string; detail?: string };

export type NewEvent = {
  id: string;
  orgId: string;
  seriesId: string | null;
  title: string;
  description: string;
  status: "draft" | "published";
  startsAt: Date;
  endsAt: Date | null;
  timeZone: string;
  venueName: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number | null;
  lng: number | null;
  speakers: string | null;
  directions: string | null;
  revivalTypes: string[];
  links: string[];
};

/** A change to one event. Only the keys present are written; `types` and `links` replace the lists. */
export type EventUpdate = {
  id: string;
  fields: Partial<
    Pick<
      EventRow,
      "title" | "description" | "startsAt" | "endsAt" | "timeZone" | "venueName" | "street" | "city" | "state" | "zip" | "lat" | "lng" | "speakers" | "directions" | "isException"
    >
  >;
  types?: string[];
  links?: string[];
};

export type ListFilter = "upcoming" | "past" | "drafts";
export type Cursor = { startsAt: Date; id: string };

/** An event without an end is assumed to last this long when looking for overlaps. */
export const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

export type EventsRepo = ReturnType<typeof createEventsRepo>;

export function createEventsRepo(db: Database) {
  type Batch = Parameters<Database["batch"]>[0];

  async function attach(rows: EventRow[]): Promise<EventFull[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.id);
    const [types, links] = await Promise.all([
      db.select().from(eventRevivalType).where(inArray(eventRevivalType.eventId, ids)),
      db.select().from(eventLink).where(inArray(eventLink.eventId, ids)).orderBy(asc(eventLink.position)),
    ]);
    return rows.map((row) => ({
      ...row,
      revivalTypes: types.filter((t) => t.eventId === row.id).map((t) => t.typeSlug).sort(),
      links: links.filter((l) => l.eventId === row.id).map((l) => l.url),
    }));
  }

  const rowsFor = (e: NewEvent) => ({
    event: {
      id: e.id,
      orgId: e.orgId,
      seriesId: e.seriesId,
      title: e.title,
      description: e.description,
      status: e.status,
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
    },
    types: e.revivalTypes.map((typeSlug) => ({ eventId: e.id, typeSlug })),
    links: e.links.map((url, position) => ({ eventId: e.id, url, position })),
  });

  return {
    /** The event this person already created with this key in the last 24 hours, if any. */
    findIdempotent: (userId: string, key: string, since: Date): Promise<string | null> =>
      withDbErrors("event.findIdempotent", async () => {
        const [row] = await db
          .select({ eventId: idempotencyRecord.eventId })
          .from(idempotencyRecord)
          .where(and(eq(idempotencyRecord.userId, userId), eq(idempotencyRecord.key, key), gte(idempotencyRecord.createdAt, since)))
          .limit(1);
        return row?.eventId ?? null;
      }),

    /**
     * Creates one event or a whole series atomically, with the key that makes a double submit safe and
     * the audit entry. A reused key (within the same person) is a unique violation and creates nothing.
     */
    createMany: (input: { series: { id: string; orgId: string; rule: string } | null; events: NewEvent[]; userId: string; idempotencyKey: string; audit: AuditEntry }): Promise<void> =>
      withDbErrors("event.createMany", async () => {
        const built = input.events.map(rowsFor);
        const statements: unknown[] = [];
        // A previous record older than 24 hours must not block a reused key.
        statements.push(
          db.delete(idempotencyRecord).where(and(eq(idempotencyRecord.userId, input.userId), eq(idempotencyRecord.key, input.idempotencyKey), lt(idempotencyRecord.createdAt, new Date(Date.now() - 24 * 3600 * 1000)))),
        );
        if (input.series) statements.push(db.insert(eventSeries).values(input.series));
        statements.push(db.insert(event).values(built.map((b) => b.event)));
        const types = built.flatMap((b) => b.types);
        if (types.length > 0) statements.push(db.insert(eventRevivalType).values(types));
        const links = built.flatMap((b) => b.links);
        if (links.length > 0) statements.push(db.insert(eventLink).values(links));
        statements.push(db.insert(idempotencyRecord).values({ userId: input.userId, key: input.idempotencyKey, eventId: input.events[0].id }));
        statements.push(db.insert(auditLog).values({ ...input.audit, detail: input.audit.detail ?? "" }));
        await db.batch(statements as unknown as Batch);
      }),

    getById: (id: string): Promise<EventFull | null> =>
      withDbErrors("event.getById", async () => {
        const [row] = await db.select().from(event).where(eq(event.id, id)).limit(1);
        return row ? (await attach([row]))[0] : null;
      }),

    getMany: (ids: string[]): Promise<EventFull[]> =>
      withDbErrors("event.getMany", async () => {
        if (ids.length === 0) return [];
        return attach(await db.select().from(event).where(inArray(event.id, ids)));
      }),

    /** An organization's events for the manager: keyset-paged by start time and id. Deleted events are never listed. */
    listByOrg: (orgId: string, filter: ListFilter, now: Date, cursor: Cursor | null, limit: number): Promise<EventFull[]> =>
      withDbErrors("event.listByOrg", async () => {
        const base = [eq(event.orgId, orgId), ne(event.status, "deleted")];
        const where =
          filter === "drafts"
            ? and(...base, eq(event.status, "draft"))
            : filter === "past"
              ? and(...base, ne(event.status, "draft"), lt(event.startsAt, now))
              : and(...base, ne(event.status, "draft"), gte(event.startsAt, now));
        const descending = filter === "past";
        const after = cursor
          ? descending
            ? or(lt(event.startsAt, cursor.startsAt), and(eq(event.startsAt, cursor.startsAt), lt(event.id, cursor.id)))
            : or(gt(event.startsAt, cursor.startsAt), and(eq(event.startsAt, cursor.startsAt), gt(event.id, cursor.id)))
          : undefined;
        const rows = await db
          .select()
          .from(event)
          .where(after ? and(where, after) : where)
          .orderBy(...(descending ? [desc(event.startsAt), desc(event.id)] : [asc(event.startsAt), asc(event.id)]))
          .limit(limit + 1);
        return attach(rows);
      }),

    /** A live event of the same organization at the same venue that overlaps the given time. */
    findOverlap: (orgId: string, venueName: string, startsAt: Date, endsAt: Date | null, excludeIds: string[]): Promise<EventRow | null> =>
      withDbErrors("event.findOverlap", async () => {
        const end = endsAt ?? new Date(startsAt.getTime() + DEFAULT_DURATION_MS);
        const [row] = await db
          .select()
          .from(event)
          .where(
            and(
              eq(event.orgId, orgId),
              inArray(event.status, ["draft", "published"]),
              sql`lower(trim(${event.venueName})) = ${venueName.trim().toLowerCase()}`,
              lt(event.startsAt, end),
              sql`coalesce(${event.endsAt}, ${event.startsAt} + interval '3 hours') > ${startsAt}`,
              excludeIds.length > 0 ? notInArray(event.id, excludeIds) : undefined,
            ),
          )
          .limit(1);
        return row ?? null;
      }),

    /** Future occurrences of a series that follow the series (not edited on their own, not deleted). */
    listSeriesFollowers: (seriesId: string, from: Date): Promise<EventFull[]> =>
      withDbErrors("event.listSeriesFollowers", async () =>
        attach(
          await db
            .select()
            .from(event)
            .where(and(eq(event.seriesId, seriesId), eq(event.isException, false), ne(event.status, "deleted"), gte(event.startsAt, from)))
            .orderBy(asc(event.startsAt), asc(event.id)),
        ),
      ),

    /**
     * Applies edits atomically. The first update carries the version check; if it matched nothing
     * (someone else changed the event first) no other statement runs and `false` is returned.
     */
    applyUpdates: (input: { primaryId: string; expectedVersion: number; updates: EventUpdate[]; audit: AuditEntry }): Promise<boolean> =>
      withDbErrors("event.applyUpdates", async () => {
        const token = randomUUID();
        const guard = (id: string) => sql`exists (select 1 from event where id = ${id} and edit_token = ${token})`;
        const statements: unknown[] = [];
        const now = new Date();
        for (const u of input.updates) {
          const isPrimary = u.id === input.primaryId;
          statements.push(
            db
              .update(event)
              .set({ ...u.fields, version: sql`${event.version} + 1`, editToken: token, updatedAt: now })
              .where(isPrimary ? and(eq(event.id, u.id), eq(event.version, input.expectedVersion)) : eq(event.id, u.id)),
          );
        }
        for (const u of input.updates) {
          if (u.types) {
            statements.push(db.delete(eventRevivalType).where(and(eq(eventRevivalType.eventId, u.id), guard(u.id))));
            for (const slug of u.types) {
              statements.push(
                db.execute(sql`insert into event_revival_type (event_id, type_slug) select ${u.id}::uuid, ${slug} where ${guard(u.id)}`),
              );
            }
          }
          if (u.links) {
            statements.push(db.delete(eventLink).where(and(eq(eventLink.eventId, u.id), guard(u.id))));
            for (const [position, url] of u.links.entries()) {
              statements.push(
                db.execute(sql`insert into event_link (event_id, url, position) select ${u.id}::uuid, ${url}, ${position} where ${guard(u.id)}`),
              );
            }
          }
        }
        statements.push(
          db.execute(
            sql`insert into audit_log (actor_id, action, subject, detail) select ${input.audit.actorId}, ${input.audit.action}, ${input.audit.subject}, ${input.audit.detail ?? ""} where ${guard(input.primaryId)}`,
          ),
        );
        statements.push(db.select({ id: event.id }).from(event).where(and(eq(event.id, input.primaryId), sql`edit_token = ${token}`)));
        const results = await db.batch(statements as unknown as Batch);
        const check = results[results.length - 1] as unknown[];
        return check.length > 0;
      }),

    /** Changes a status (publish, cancel, delete) atomically with its audit entry. Returns the new version, or null if the event was not in an allowed state. */
    setStatus: (input: { id: string; from: string[]; to: "published" | "cancelled" | "deleted"; audit: AuditEntry }): Promise<number | null> =>
      withDbErrors("event.setStatus", async () => {
        const token = randomUUID();
        const results = await db.batch([
          db
            .update(event)
            .set({ status: input.to, version: sql`${event.version} + 1`, editToken: token, updatedAt: new Date() })
            .where(and(eq(event.id, input.id), inArray(event.status, input.from)))
            .returning({ version: event.version }),
          db.execute(
            sql`insert into audit_log (actor_id, action, subject, detail) select ${input.audit.actorId}, ${input.audit.action}, ${input.audit.subject}, ${input.audit.detail ?? ""} where exists (select 1 from event where id = ${input.id} and edit_token = ${token})`,
          ),
        ] as unknown as Batch);
        const updated = results[0] as { version: number }[];
        return updated.length > 0 ? updated[0].version : null;
      }),
  };
}
