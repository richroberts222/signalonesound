import { MAX_OCCURRENCES, parseDate, parseLocalDateTime } from "@signalone/shared";
import { z } from "zod";

import { isSafeLink } from "./organization";
import { isTimeZone } from "./profile";

// S3 EVENTS (docs/features/s3-events-church-portal.md). Public wire contracts for creating, editing
// and reading a Church/Ministry's events. Times travel as local wall-clock text ("YYYY-MM-DDTHH:mm")
// plus the event's IANA time zone; the server stores the exact moment (UTC) and returns both forms.
// Independent of database row types and shared by web and mobile.

/** The twelve revival types from the source plan. An event may carry several. */
export const REVIVAL_TYPES = [
  { slug: "tent-revivals", label: "Tent revivals" },
  { slug: "church-revivals", label: "Church revivals" },
  { slug: "baptisms", label: "Baptisms" },
  { slug: "worship-nights", label: "Worship nights" },
  { slug: "prayer-gatherings", label: "Prayer gatherings" },
  { slug: "healing-deliverance", label: "Healing & Deliverance" },
  { slug: "conferences", label: "Conferences" },
  { slug: "youth-events", label: "Youth events" },
  { slug: "womens-events", label: "Women's events" },
  { slug: "mens-events", label: "Men's events" },
  { slug: "family-events", label: "Family events" },
  { slug: "other", label: "Other" },
] as const;
export const REVIVAL_TYPE_SLUGS = REVIVAL_TYPES.map((t) => t.slug) as [string, ...string[]];

/** Phase 1 addresses are US only: the 50 states and DC. */
export const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA",
  "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR",
  "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

export const EVENT_TITLE_MIN = 3;
export const EVENT_TITLE_MAX = 120;
export const EVENT_DESCRIPTION_MAX = 4000;
export const EVENT_LINK_MAX = 3;
/** A start further ahead than this is refused (about two years). */
export const MAX_START_AHEAD_DAYS = 731;
export const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

const codePoints = (value: string): number => [...value].length;
const hasControlCharacter = (value: string, allowNewline = false): boolean =>
  [...value].some((char) => {
    const code = char.codePointAt(0) ?? 0;
    if (allowNewline && code === 10) return false;
    return code < 32 || code === 127 || (code >= 128 && code < 160);
  });

const line = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => codePoints(v) >= min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .refine((v) => codePoints(v) <= max, `${label} must be at most ${max} characters`)
    .refine((v) => !hasControlCharacter(v), `${label} must be plain text on one line`);

const text = (label: string, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => codePoints(v) <= max, `${label} must be at most ${max} characters`)
    .refine((v) => !hasControlCharacter(v, true), `${label} must be plain text`);

const localDateTime = z.string().refine((v) => parseLocalDateTime(v) !== null, "Enter a real date and time");
const localDate = z.string().refine((v) => parseDate(v) !== null, "Enter a real date");

/** A recurrence: weekly or monthly-by-weekday up to a date, or an explicit list of extra dates. */
export const recurrenceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("weekly"), until: localDate }).strict(),
  z.object({ kind: z.literal("monthly_weekday"), until: localDate }).strict(),
  z.object({ kind: z.literal("dates"), dates: z.array(localDate).min(1).max(MAX_OCCURRENCES) }).strict(),
]);
export type RecurrenceInput = z.infer<typeof recurrenceSchema>;

const linksSchema = z
  .array(z.string().trim().refine(isSafeLink, "Enter a web address starting with http:// or https://"))
  .max(EVENT_LINK_MAX, `Add at most ${EVENT_LINK_MAX} links`);

/** The editable fields of an event (shared by create and edit). */
export const eventFieldsSchema = z.object({
  title: line("Title", EVENT_TITLE_MIN, EVENT_TITLE_MAX),
  description: text("Description", EVENT_DESCRIPTION_MAX).default(""),
  startLocal: localDateTime,
  endLocal: localDateTime.optional(),
  timeZone: z.string().refine(isTimeZone, "Choose a time zone"),
  venueName: line("Venue name", 1, 120),
  street: line("Street", 1, 120),
  city: line("City", 1, 80),
  state: z.enum(US_STATES, { error: "Choose a state" }),
  zip: z.string().trim().regex(/^\d{5}(-\d{4})?$/, "Enter a 5 or 9 digit ZIP code"),
  revivalTypes: z
    .array(z.enum(REVIVAL_TYPE_SLUGS, { error: "Unknown revival type" }))
    .min(1, "Choose at least one revival type")
    .max(REVIVAL_TYPES.length)
    .refine((v) => new Set(v).size === v.length, "Each revival type once"),
  speakers: line("Speakers", 0, 300).optional(),
  directions: text("Directions", 500).optional(),
  links: linksSchema.default([]),
});

/** Create an event (or a recurring series). `publish: false` saves a draft. */
export const createEventSchema = eventFieldsSchema
  .extend({
    publish: z.boolean().default(false),
    recurrence: recurrenceSchema.optional(),
    /** Required to create an event that looks like a duplicate; recorded in the audit log. */
    duplicateOverrideReason: line("Reason", 1, 300).optional(),
  })
  .strict();
export type CreateEventInput = z.infer<typeof createEventSchema>;

/** Edit an event. `version` is the version the editor loaded; a stale one is a conflict. */
export const patchEventSchema = eventFieldsSchema
  .partial()
  .extend({
    version: z.number().int().min(1),
    scope: z.enum(["this", "series"]).default("this"),
    duplicateOverrideReason: line("Reason", 1, 300).optional(),
  })
  .strict();
export type PatchEventInput = z.infer<typeof patchEventSchema>;

export const eventParamsSchema = z.object({ id: z.string().uuid() });
export const orgEventsParamsSchema = z.object({ id: z.string().uuid() });
export const EVENT_FILTERS = ["upcoming", "past", "drafts"] as const;
export const eventListQuerySchema = z.object({
  filter: z.enum(EVENT_FILTERS).default("upcoming"),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type EventListQuery = z.infer<typeof eventListQuerySchema>;

export const EVENT_STATUSES = ["draft", "published", "cancelled", "deleted"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

/** An event as its managers see it, in any state. */
export const eventSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  seriesId: z.string().uuid().nullable(),
  isException: z.boolean(),
  title: z.string(),
  description: z.string(),
  status: z.enum(EVENT_STATUSES),
  moderationState: z.string(),
  startsAt: z.string(),
  endsAt: z.string().nullable(),
  startLocal: z.string(),
  endLocal: z.string().nullable(),
  timeZone: z.string(),
  venueName: z.string(),
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  /** False until the address has been located; such an event is missing from distance searches. */
  hasLocation: z.boolean(),
  revivalTypes: z.array(z.string()),
  speakers: z.string().nullable(),
  directions: z.string().nullable(),
  links: z.array(z.string()),
  version: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type EventView = z.infer<typeof eventSchema>;

export const createdEventSchema = z.object({
  event: eventSchema,
  /** How many events were created (more than one for a recurring series). */
  occurrences: z.number().int(),
});
export type CreatedEvent = z.infer<typeof createdEventSchema>;

export const eventListSchema = z.object({ items: z.array(eventSchema), nextCursor: z.string().nullable() });
export type EventList = z.infer<typeof eventListSchema>;

export const eventStatusResultSchema = z.object({ id: z.string().uuid(), status: z.enum(EVENT_STATUSES), version: z.number().int() });
export type EventStatusResult = z.infer<typeof eventStatusResultSchema>;
