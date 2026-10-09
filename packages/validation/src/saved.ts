import { z } from "zod";

import { publicEventSchema } from "./discover";

// S6 SAVED EVENTS AND INVITES (docs/features/s6-saved-events-and-invites.md). Public wire contracts for
// a member's own saved list and for invite links. The link between a person and a church event is
// sensitive: nothing here ever shows who saved an event, and an invite is a random link with no record
// of who it was sent to.

export const MAX_SAVED_EVENTS = 500;
export const MAX_INVITES_PER_DAY = 10;
export const INVITE_DAYS = 30;
/** A saved event that is over is removed this many days after it happened. */
export const SAVED_RETENTION_DAYS = 30;

export const savedEventParamsSchema = z.object({ eventId: z.string().uuid() });
export const savedListQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SavedListQuery = z.infer<typeof savedListQuerySchema>;

/**
 * A saved event as the member sees it. `upcoming` and `past` carry the event; `cancelled` carries it
 * too, marked cancelled; `removed` means the event was deleted, held or its church is no longer
 * approved: only the id is returned, never any detail.
 */
export const savedItemSchema = z.object({
  eventId: z.string().uuid(),
  savedAt: z.string(),
  state: z.enum(["upcoming", "past", "cancelled", "removed"]),
  event: publicEventSchema.nullable(),
});
export type SavedItem = z.infer<typeof savedItemSchema>;
export const savedListSchema = z.object({ items: z.array(savedItemSchema), nextCursor: z.string().nullable() });
export type SavedList = z.infer<typeof savedListSchema>;

export const savedResultSchema = z.object({ eventId: z.string().uuid(), saved: z.boolean() });
export type SavedResult = z.infer<typeof savedResultSchema>;

// Invites: a random token (at least 128 bits), shown once; only its hash is kept.
export const inviteTokenParamsSchema = z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{22,64}$/) });
export const inviteSchema = z.object({ token: z.string(), expiresAt: z.string() });
export type Invite = z.infer<typeof inviteSchema>;
export const inviteArrivalSchema = z.object({ counted: z.boolean() });
