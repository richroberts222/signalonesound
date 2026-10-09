import {
  MAX_START_AHEAD_DAYS,
  type CreateEventInput,
  type CreatedEvent,
  type EventList,
  type EventListQuery,
  type EventStatusResult,
  type EventView,
  type PatchEventInput,
} from "@signalone/validation";
import {
  addDays,
  daysBetween,
  expandOccurrences,
  localToUtc,
  parseLocalDateTime,
  utcToLocalString,
  type RecurrenceRule,
} from "@signalone/shared";
import { randomUUID } from "node:crypto";

import { DatabaseError } from "../../db/errors";
import type { Cursor, EventFull, EventUpdate, EventsRepo, NewEvent } from "../../db/events";
import type { ServiceContext } from "./context";
import { conflict, notFound, validationFailed } from "./errors";
import type { AdminDirectory } from "./organizations";

// Service for events (S3, docs/features/s3-events-church-portal.md, docs/permissions.md). Rules, all
// checked on the server on every request and against the event's own organization:
//   * only an approved manager of the organization (or an admin) may create, edit, publish, cancel or
//     delete its events; anyone else is told "not found";
//   * times are stored as an exact moment plus the zone, and a recurring series keeps the same local
//     time of day across daylight-saving changes;
//   * a double submit never makes a second event, and a stale edit never overwrites a newer one;
//   * every change is written to the audit log in the same atomic step.
// Framework-free; the repo, the manager check, the geocoder and the clock are injected.

/** Turns an address into coordinates. The real adapter arrives with search (S4); until then none is set. */
export type Geocoder = {
  geocode(address: { street: string; city: string; state: string; zip: string }): Promise<{ lat: number; lng: number } | null>;
};
export const noGeocoder: Geocoder = { geocode: async () => null };

export type EventsServiceDeps = {
  repo: EventsRepo;
  /** Is this person an approved manager of the organization? */
  isManager: (orgId: string, userId: string) => Promise<boolean>;
  admins: AdminDirectory;
  requireAccepted: (userId: string) => Promise<void>;
  geocoder?: Geocoder;
  now?: () => Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

const encodeCursor = (c: Cursor): string => Buffer.from(`${c.startsAt.toISOString()}|${c.id}`).toString("base64url");
function decodeCursor(value: string): Cursor {
  try {
    const [iso, id] = Buffer.from(value, "base64url").toString("utf8").split("|");
    const startsAt = new Date(iso);
    if (Number.isNaN(startsAt.getTime()) || !/^[0-9a-f-]{36}$/.test(id ?? "")) throw new Error("bad cursor");
    return { startsAt, id };
  } catch {
    throw validationFailed("Invalid cursor");
  }
}

function toView(e: EventFull): EventView {
  return {
    id: e.id,
    organizationId: e.orgId,
    seriesId: e.seriesId,
    isException: e.isException,
    title: e.title,
    description: e.description,
    status: e.status as EventView["status"],
    moderationState: e.moderationState,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt ? e.endsAt.toISOString() : null,
    startLocal: utcToLocalString(e.startsAt, e.timeZone),
    endLocal: e.endsAt ? utcToLocalString(e.endsAt, e.timeZone) : null,
    timeZone: e.timeZone,
    venueName: e.venueName,
    street: e.street,
    city: e.city,
    state: e.state,
    zip: e.zip,
    hasLocation: e.lat !== null && e.lng !== null,
    revivalTypes: e.revivalTypes,
    speakers: e.speakers,
    directions: e.directions,
    links: e.links,
    version: e.version,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

/** "2026-10-14T19:00" split into its date and time parts. */
const splitLocal = (value: string): { date: string; time: string } => ({ date: value.slice(0, 10), time: value.slice(11) });

export function createEventsService({ repo, isManager, admins, requireAccepted, geocoder = noGeocoder, now = () => new Date() }: EventsServiceDeps) {
  const mayManage = async (ctx: ServiceContext, orgId: string): Promise<boolean> =>
    admins.isAdmin(ctx.actor.userId) || (await isManager(orgId, ctx.actor.userId));

  /** Loads an event the caller may manage; anything else is "not found" (existence is not revealed). */
  async function loadManaged(ctx: ServiceContext, id: string): Promise<EventFull> {
    const found = await repo.getById(id);
    if (!found || !(await mayManage(ctx, found.orgId))) throw notFound();
    return found;
  }

  /** Checks end after start and start within bounds, returning the exact moments. */
  function moments(startLocal: string, endLocal: string | undefined | null, timeZone: string, { allowPast }: { allowPast: boolean }) {
    const startParts = parseLocalDateTime(startLocal);
    if (!startParts) throw validationFailed("Enter a real start date and time", { startLocal: ["Enter a real date and time"] });
    const startsAt = localToUtc(startParts, timeZone);
    let endsAt: Date | null = null;
    if (endLocal) {
      const endParts = parseLocalDateTime(endLocal);
      if (!endParts) throw validationFailed("Enter a real end date and time", { endLocal: ["Enter a real date and time"] });
      endsAt = localToUtc(endParts, timeZone);
      if (endsAt.getTime() <= startsAt.getTime()) throw validationFailed("The end must be after the start", { endLocal: ["The end must be after the start"] });
    }
    const current = now().getTime();
    if (!allowPast && startsAt.getTime() < current) throw validationFailed("The start must be in the future", { startLocal: ["The start must be in the future"] });
    if (startsAt.getTime() > current + MAX_START_AHEAD_DAYS * DAY_MS) {
      throw validationFailed("The start is more than two years away", { startLocal: ["Choose a date within two years"] });
    }
    return { startsAt, endsAt };
  }

  /** The first result of an earlier create with the same key. */
  async function replay(firstEventId: string): Promise<CreatedEvent> {
    const found = await repo.getById(firstEventId);
    if (!found) throw notFound();
    const occurrences = found.seriesId ? (await repo.listSeriesFollowers(found.seriesId, new Date(0))).length + (found.isException ? 1 : 0) : 1;
    return { event: toView(found), occurrences };
  }

  async function transition(ctx: ServiceContext, current: EventFull, from: string[], to: "published" | "cancelled" | "deleted", action: string): Promise<EventStatusResult> {
    const version = await repo.setStatus({
      id: current.id,
      from,
      to,
      audit: { actorId: ctx.actor.userId, action, subject: `organization:${current.orgId}; event:${current.id}` },
    });
    if (version === null) throw conflict("This event cannot be changed from its current state");
    return { id: current.id, status: to, version };
  }

  return {
    /** Creates one event or a recurring series. Needs an Idempotency-Key so a double submit is safe. */
    async create(ctx: ServiceContext, orgId: string, input: CreateEventInput, idempotencyKey: string | null): Promise<CreatedEvent> {
      const userId = ctx.actor.userId;
      await requireAccepted(userId);
      if (!(await mayManage(ctx, orgId))) throw notFound();
      if (!idempotencyKey || !KEY_PATTERN.test(idempotencyKey)) throw validationFailed("An Idempotency-Key header (8 to 128 letters, digits, - or _) is required");

      const since = new Date(now().getTime() - DAY_MS);
      const repeated = await repo.findIdempotent(userId, idempotencyKey, since);
      if (repeated) return replay(repeated);

      const first = moments(input.startLocal, input.endLocal, input.timeZone, { allowPast: false });
      const start = splitLocal(input.startLocal);
      const rule: RecurrenceRule | null = input.recurrence ?? null;
      if (rule && rule.kind !== "dates" && daysBetween(start.date, rule.until) < 0) {
        throw validationFailed("The series must end after its first date", { recurrence: ["The end date is before the first date"] });
      }
      const dates = expandOccurrences(start.date, rule);
      const endOffsetDays = input.endLocal ? daysBetween(start.date, splitLocal(input.endLocal).date) : 0;
      const endTime = input.endLocal ? splitLocal(input.endLocal).time : null;

      const overlap = await repo.findOverlap(orgId, input.venueName, first.startsAt, first.endsAt, []);
      if (overlap && !input.duplicateOverrideReason) {
        throw conflict("A similar event already exists at this venue and time. Add a reason to create it anyway.");
      }

      const where = await geocoder.geocode({ street: input.street, city: input.city, state: input.state, zip: input.zip });
      const seriesId = dates.length > 1 ? randomUUID() : null;
      const events: NewEvent[] = dates.map((date) => {
        const startParts = parseLocalDateTime(`${date}T${start.time}`)!;
        const endsAt = endTime ? localToUtc(parseLocalDateTime(`${addDays(date, endOffsetDays)}T${endTime}`)!, input.timeZone) : null;
        return {
          id: randomUUID(),
          orgId,
          seriesId,
          title: input.title,
          description: input.description,
          status: input.publish ? "published" : "draft",
          startsAt: localToUtc(startParts, input.timeZone),
          endsAt,
          timeZone: input.timeZone,
          venueName: input.venueName,
          street: input.street,
          city: input.city,
          state: input.state,
          zip: input.zip,
          lat: where?.lat ?? null,
          lng: where?.lng ?? null,
          speakers: input.speakers ?? null,
          directions: input.directions ?? null,
          revivalTypes: input.revivalTypes,
          links: input.links,
        };
      });

      try {
        await repo.createMany({
          series: seriesId ? { id: seriesId, orgId, rule: JSON.stringify(rule) } : null,
          events,
          userId,
          idempotencyKey,
          audit: {
            actorId: userId,
            action: "event.create",
            subject: `organization:${orgId}; event:${events[0].id}`,
            detail: `${events.length} occurrence(s)${overlap ? `; duplicate override: ${input.duplicateOverrideReason}` : ""}`,
          },
        });
      } catch (error) {
        // A concurrent request with the same key won the race: return its result instead of failing.
        if (error instanceof DatabaseError && error.kind === "unique_violation") {
          const winner = await repo.findIdempotent(userId, idempotencyKey, since);
          if (winner) return replay(winner);
        }
        throw error;
      }
      const created = await repo.getById(events[0].id);
      return { event: toView(created!), occurrences: events.length };
    },

    /** One event in any state, for its managers. */
    async get(ctx: ServiceContext, id: string): Promise<EventView> {
      return toView(await loadManaged(ctx, id));
    },

    /** An organization's events for its managers: upcoming, past or drafts, keyset-paged. Deleted events are never listed. */
    async list(ctx: ServiceContext, orgId: string, query: EventListQuery): Promise<EventList> {
      if (!(await mayManage(ctx, orgId))) throw notFound();
      const rows = await repo.listByOrg(orgId, query.filter, now(), query.cursor ? decodeCursor(query.cursor) : null, query.limit);
      const page = rows.slice(0, query.limit);
      const last = page[page.length - 1];
      return {
        items: page.map(toView),
        nextCursor: rows.length > query.limit && last ? encodeCursor({ startsAt: last.startsAt, id: last.id }) : null,
      };
    },

    /** Edits an event ("this") or the future occurrences of its series ("series"). A stale version is a conflict. */
    async update(ctx: ServiceContext, id: string, patch: PatchEventInput): Promise<EventView> {
      await requireAccepted(ctx.actor.userId);
      const current = await loadManaged(ctx, id);
      if (current.status === "deleted") throw notFound();
      if (current.startsAt.getTime() < now().getTime()) throw conflict("Past events cannot be edited");
      if (patch.version !== current.version) throw conflict("This event was changed by someone else. Reload and try again.");
      if (patch.scope === "series" && !current.seriesId) throw validationFailed("This event is not part of a series");

      const timeZone = patch.timeZone ?? current.timeZone;
      const startLocal = patch.startLocal ?? utcToLocalString(current.startsAt, current.timeZone);
      const endLocal = patch.endLocal ?? (current.endsAt ? utcToLocalString(current.endsAt, current.timeZone) : undefined);
      const { startsAt, endsAt } = moments(startLocal, endLocal, timeZone, { allowPast: false });

      const addressChanged = ["street", "city", "state", "zip"].some((k) => patch[k as "street"] !== undefined && patch[k as "street"] !== current[k as "street"]);
      const where = addressChanged
        ? await geocoder.geocode({
            street: patch.street ?? current.street,
            city: patch.city ?? current.city,
            state: patch.state ?? current.state,
            zip: patch.zip ?? current.zip,
          })
        : undefined;

      const venueName = patch.venueName ?? current.venueName;
      const timeChanged = patch.startLocal !== undefined || patch.endLocal !== undefined || patch.timeZone !== undefined;
      if (timeChanged || patch.venueName !== undefined) {
        const overlap = await repo.findOverlap(current.orgId, venueName, startsAt, endsAt, [current.id]);
        if (overlap && overlap.seriesId !== current.seriesId && !patch.duplicateOverrideReason) {
          throw conflict("A similar event already exists at this venue and time. Add a reason to save it anyway.");
        }
      }

      const common: EventUpdate["fields"] = {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.timeZone !== undefined ? { timeZone: patch.timeZone } : {}),
        ...(patch.venueName !== undefined ? { venueName: patch.venueName } : {}),
        ...(patch.street !== undefined ? { street: patch.street } : {}),
        ...(patch.city !== undefined ? { city: patch.city } : {}),
        ...(patch.state !== undefined ? { state: patch.state } : {}),
        ...(patch.zip !== undefined ? { zip: patch.zip } : {}),
        ...(patch.speakers !== undefined ? { speakers: patch.speakers } : {}),
        ...(patch.directions !== undefined ? { directions: patch.directions } : {}),
        ...(where !== undefined ? { lat: where?.lat ?? null, lng: where?.lng ?? null } : {}),
      };
      const lists = {
        ...(patch.revivalTypes !== undefined ? { types: patch.revivalTypes } : {}),
        ...(patch.links !== undefined ? { links: patch.links } : {}),
      };

      const updates: EventUpdate[] = [
        {
          id: current.id,
          fields: {
            ...common,
            ...(timeChanged ? { startsAt, endsAt } : {}),
            // Editing one occurrence on its own makes it an exception, so later series edits skip it.
            ...(patch.scope === "this" && current.seriesId ? { isException: true } : {}),
          },
          ...lists,
        },
      ];

      if (patch.scope === "series" && current.seriesId) {
        // Future occurrences follow the same changes. Times keep each occurrence's own date.
        const newStart = splitLocal(startLocal);
        const dayOffset = endLocal ? daysBetween(newStart.date, splitLocal(endLocal).date) : 0;
        const followers = await repo.listSeriesFollowers(current.seriesId, now());
        for (const f of followers) {
          if (f.id === current.id) continue;
          const date = splitLocal(utcToLocalString(f.startsAt, f.timeZone)).date;
          const own: EventUpdate["fields"] = { ...common };
          if (timeChanged) {
            own.startsAt = localToUtc(parseLocalDateTime(`${date}T${newStart.time}`)!, timeZone);
            own.endsAt = endLocal ? localToUtc(parseLocalDateTime(`${addDays(date, dayOffset)}T${splitLocal(endLocal).time}`)!, timeZone) : null;
          }
          updates.push({ id: f.id, fields: own, ...lists });
        }
      }

      const applied = await repo.applyUpdates({
        primaryId: current.id,
        expectedVersion: patch.version,
        updates,
        audit: {
          actorId: ctx.actor.userId,
          action: "event.update",
          subject: `organization:${current.orgId}; event:${current.id}`,
          detail: `scope ${patch.scope}; ${updates.length} event(s); fields: ${Object.keys(patch).filter((k) => !["version", "scope"].includes(k)).join(",")}${patch.duplicateOverrideReason ? `; duplicate override: ${patch.duplicateOverrideReason}` : ""}`,
        },
      });
      if (!applied) throw conflict("This event was changed by someone else. Reload and try again.");
      return toView((await repo.getById(current.id))!);
    },

    /** Makes a draft public. A past event cannot be published. */
    async publish(ctx: ServiceContext, id: string): Promise<EventStatusResult> {
      await requireAccepted(ctx.actor.userId);
      const current = await loadManaged(ctx, id);
      if (current.startsAt.getTime() < now().getTime()) throw conflict("A past event cannot be published");
      return transition(ctx, current, ["draft"], "published", "event.publish");
    },

    /** Marks a published event cancelled; it stays visible as cancelled until its date passes. */
    async cancel(ctx: ServiceContext, id: string): Promise<EventStatusResult> {
      await requireAccepted(ctx.actor.userId);
      return transition(ctx, await loadManaged(ctx, id), ["published"], "cancelled", "event.cancel");
    },

    /** Soft delete: hidden everywhere, kept for the audit trail. Allowed for past events too. */
    async remove(ctx: ServiceContext, id: string): Promise<EventStatusResult> {
      await requireAccepted(ctx.actor.userId);
      return transition(ctx, await loadManaged(ctx, id), ["draft", "published", "cancelled"], "deleted", "event.delete");
    },
  };
}

export type EventsService = ReturnType<typeof createEventsService>;
