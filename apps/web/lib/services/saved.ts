import { createHash, randomBytes } from "node:crypto";
import {
  INVITE_DAYS,
  MAX_INVITES_PER_DAY,
  MAX_SAVED_EVENTS,
  SAVED_RETENTION_DAYS,
  type Invite,
  type SavedItem,
  type SavedList,
  type SavedListQuery,
  type SavedResult,
} from "@signalone/validation";

import type { EventsRepo } from "../../db/events";
import type { SavedCursor, SavedRepo } from "../../db/saved";
import type { ServiceContext } from "./context";
import { toPublicEvent } from "./discover";
import { conflict, notFound, rateLimited, validationFailed } from "./errors";

// Service for saved events and invites (S6, docs/features/s6-saved-events-and-invites.md). A saved
// event links a person to a church event, which is sensitive, so: every read and write is scoped to
// the authenticated caller, nothing here can tell anyone who saved an event, and an invite is a random
// link that records only how many people arrived. Framework-free; repos and the clock are injected.

export type SavedServiceDeps = {
  repo: SavedRepo;
  events: Pick<EventsRepo, "getPublic" | "getManyWithOrg">;
  requireAccepted: (userId: string) => Promise<void>;
  now?: () => Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

const encodeCursor = (c: SavedCursor): string => Buffer.from(JSON.stringify({ p: c.past, s: c.startsAt.toISOString(), i: c.eventId })).toString("base64url");
function decodeCursor(value: string): SavedCursor {
  try {
    const raw = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as { p: boolean; s: string; i: string };
    const startsAt = new Date(raw.s);
    if (Number.isNaN(startsAt.getTime()) || typeof raw.p !== "boolean" || !/^[0-9a-f-]{36}$/.test(raw.i)) throw new Error("bad cursor");
    return { past: raw.p, startsAt, eventId: raw.i };
  } catch {
    throw validationFailed("Invalid cursor");
  }
}

export function createSavedService({ repo, events, requireAccepted, now = () => new Date() }: SavedServiceDeps) {
  return {
    /** Whether the caller has saved this event (for the Save button). */
    async isSaved(ctx: ServiceContext, eventId: string): Promise<SavedResult> {
      return { eventId, saved: await repo.isSaved(ctx.actor.userId, eventId) };
    },

    /** Saves a public event for the caller. Saving twice is the same as once. */
    async save(ctx: ServiceContext, eventId: string): Promise<SavedResult> {
      await requireAccepted(ctx.actor.userId);
      if (!(await events.getPublic(eventId))) throw notFound(); // drafts, deleted and held events cannot be saved
      if ((await repo.countByUser(ctx.actor.userId)) >= MAX_SAVED_EVENTS) throw conflict("You have saved the most events allowed. Remove one to save another.");
      await repo.save(ctx.actor.userId, eventId);
      return { eventId, saved: true };
    },

    /** Removes a saved event. Removing one that is not saved succeeds quietly. */
    async unsave(ctx: ServiceContext, eventId: string): Promise<SavedResult> {
      await repo.remove(ctx.actor.userId, eventId);
      return { eventId, saved: false };
    },

    /** The caller's saved events: upcoming first, then past ones. A removed event is shown only as removed. */
    async list(ctx: ServiceContext, query: SavedListQuery): Promise<SavedList> {
      const at = now();
      const refs = await repo.list(ctx.actor.userId, at, query.cursor ? decodeCursor(query.cursor) : null, query.limit);
      const page = refs.slice(0, query.limit);
      const rows = new Map((await events.getManyWithOrg(page.map((r) => r.eventId))).map((r) => [r.id, r]));
      const items: SavedItem[] = page.map((ref) => {
        const row = rows.get(ref.eventId);
        const visible = row && ["published", "cancelled"].includes(row.status) && row.moderationState === "published" && row.orgStatus === "approved";
        if (!row || !visible) return { eventId: ref.eventId, savedAt: ref.savedAt.toISOString(), state: "removed", event: null };
        return {
          eventId: ref.eventId,
          savedAt: ref.savedAt.toISOString(),
          state: row.status === "cancelled" ? "cancelled" : ref.past ? "past" : "upcoming",
          event: toPublicEvent(row),
        };
      });
      const last = page[page.length - 1];
      return {
        items,
        nextCursor: refs.length > query.limit && last ? encodeCursor({ past: last.past, startsAt: last.startsAt, eventId: last.eventId }) : null,
      };
    },

    /** Makes an invite link: a random token (192 bits) shown once; only its hash is kept. */
    async createInvite(ctx: ServiceContext): Promise<Invite> {
      await requireAccepted(ctx.actor.userId);
      const at = now();
      if ((await repo.countInvitesSince(ctx.actor.userId, new Date(at.getTime() - DAY_MS))) >= MAX_INVITES_PER_DAY) throw rateLimited();
      const token = randomBytes(24).toString("base64url");
      const expiresAt = new Date(at.getTime() + INVITE_DAYS * DAY_MS);
      await repo.createInvite(hashToken(token), ctx.actor.userId, expiresAt);
      return { token, expiresAt: expiresAt.toISOString() };
    },

    /** Counts one arrival from an invite link. Records nothing about the visitor. */
    async recordArrival(token: string): Promise<{ counted: boolean }> {
      return { counted: await repo.recordArrival(hashToken(token), now()) };
    },

    /** The retention job: saved events 30 days after the event ended, and expired invite links. */
    async purge(): Promise<{ savedRemoved: number; invitesRemoved: number }> {
      const at = now();
      return {
        savedRemoved: await repo.purgeEnded(new Date(at.getTime() - SAVED_RETENTION_DAYS * DAY_MS)),
        invitesRemoved: await repo.purgeExpiredInvites(at),
      };
    },
  };
}

export type SavedService = ReturnType<typeof createSavedService>;
