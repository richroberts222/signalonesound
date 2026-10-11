import { MAX_OCCURRENCES, parseDate, parseLocalDateTime } from "@signalone/shared";
import { z } from "zod";

import { COUNTRY_CODES, countryName } from "./countries";
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

/** A spot on the map, from the location picker. The server re-checks it, whatever sent it (S17). */
export const pinSchema = z
  .object({
    lat: z.number({ error: "Latitude must be a number" }).min(-90, "Latitude must be between -90 and 90").max(90, "Latitude must be between -90 and 90"),
    lng: z.number({ error: "Longitude must be a number" }).min(-180, "Longitude must be between -180 and 180").max(180, "Longitude must be between -180 and 180"),
  })
  .strict();
export type Pin = z.infer<typeof pinSchema>;

/**
 * The address rules that depend on the country (S17): the United States needs a state and a ZIP code as before;
 * anywhere else the state or region and the postal code are optional free text. Returns the problems by field,
 * or null when the address is fine. Used by the create schema and by the service when it edits.
 */
export function addressProblems(address: { country: string; state: string; zip: string }): Record<string, string[]> | null {
  if (address.country !== "US") return null;
  const problems: Record<string, string[]> = {};
  if (!(US_STATES as readonly string[]).includes(address.state)) problems.state = ["Choose a state"];
  if (!/^\d{5}(-\d{4})?$/.test(address.zip)) problems.zip = ["Enter a 5 or 9 digit ZIP code"];
  return Object.keys(problems).length > 0 ? problems : null;
}

/** The text kept in an event's state column: the US state, or elsewhere the free-text region. */
export const storedState = (country: string, state: string, region: string | undefined): string => (country === "US" ? state : (region ?? ""));

/** "City, ST" in the United States and "City, Country" anywhere else: how a place is named on the map and in lists. */
export const placeLabel = (city: string, state: string, country: string): string => (country === "US" ? `${city}, ${state}` : `${city}, ${countryName(country)}`);

/**
 * The editable fields of an event, with no defaults. An edit is built from these, so a field the edit leaves out
 * stays as it was (zod applies a default even inside `.partial()`, which would reset a description or the links).
 */
const eventShape = {
  title: line("Title", EVENT_TITLE_MIN, EVENT_TITLE_MAX),
  description: text("Description", EVENT_DESCRIPTION_MAX),
  startLocal: localDateTime,
  endLocal: localDateTime.optional(),
  timeZone: z.string().refine(isTimeZone, "Choose a time zone"),
  venueName: line("Venue name", 1, 120),
  street: line("Street", 1, 120),
  city: line("City", 1, 80),
  /** Two-letter country code; the United States unless chosen otherwise. */
  country: z.enum(COUNTRY_CODES, { error: "Choose a country" }),
  /** A US state (required when the country is the United States, see addressProblems); empty elsewhere. */
  state: z.enum([...US_STATES, ""], { error: "Choose a state" }),
  /** Outside the United States: the state, province or region as free text. Stored in the same place as a state. */
  region: line("Region", 0, 80).optional(),
  zip: line("ZIP or postal code", 0, 20),
  /** Where the pin is. Absent means "work it out from the address" (nothing today); null clears it on an edit. */
  location: pinSchema.nullable().optional(),
  revivalTypes: z
    .array(z.enum(REVIVAL_TYPE_SLUGS, { error: "Unknown revival type" }))
    .min(1, "Choose at least one revival type")
    .max(REVIVAL_TYPES.length)
    .refine((v) => new Set(v).size === v.length, "Each revival type once"),
  speakers: line("Speakers", 0, 300).optional(),
  directions: text("Directions", 500).optional(),
  links: linksSchema,
};

/** The editable fields of a new event: the same, with defaults for the ones that may be left out. */
export const eventFieldsSchema = z.object({
  ...eventShape,
  description: eventShape.description.default(""),
  country: eventShape.country.default("US"),
  state: eventShape.state.default(""),
  zip: eventShape.zip.default(""),
  links: eventShape.links.default([]),
});

/** Create an event (or a recurring series). `publish: false` saves a draft. */
export const createEventSchema = eventFieldsSchema
  .extend({
    publish: z.boolean().default(false),
    recurrence: recurrenceSchema.optional(),
    /** Required to create an event that looks like a duplicate; recorded in the audit log. */
    duplicateOverrideReason: line("Reason", 1, 300).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const problems = addressProblems(value);
    for (const [field, messages] of Object.entries(problems ?? {})) for (const message of messages) ctx.addIssue({ code: "custom", path: [field], message });
  });
export type CreateEventInput = z.infer<typeof createEventSchema>;

/** Edit an event. `version` is the version the editor loaded; a stale one is a conflict. */
export const patchEventSchema = z
  .object(eventShape)
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
  country: z.string(),
  /** False until the event has a pin; such an event is missing from distance searches and the Fire Map. */
  hasLocation: z.boolean(),
  /** The pin, so an edit form can show it; null until one is set. */
  location: pinSchema.nullable(),
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
