import { parseDate } from "@signalone/shared";
import { z } from "zod";

import { REVIVAL_TYPE_SLUGS } from "./event";

// S4 DISCOVER (docs/features/s4-discover-web.md). Public wire contracts for searching events and
// reading one. Everything here is public: no sign-in, no identifier, and no record of who searched.

/**
 * The search radius "X" is UNDECIDED in the source plan. It is one setting, read by the screens and
 * by the API validator, so the owner's answer changes it without touching anything else.
 */
export const RADIUS_X_MILES = 100;
export const RADIUS_CHOICES = [10, 25, 50, RADIUS_X_MILES] as const;
export const SEARCH_LIMIT_DEFAULT = 20;
export const SEARCH_LIMIT_MAX = 50;
/** A searcher's position is rounded to this many decimals (about 1 km) before use and is never stored. */
export const SEARCH_POSITION_DECIMALS = 2;

export const roundPosition = (value: number): number => {
  const factor = 10 ** SEARCH_POSITION_DECIMALS;
  return Math.round(value * factor) / factor;
};

const localDate = z.string().refine((v) => parseDate(v) !== null, "Enter a real date");

/** Search query. Position and radius go together; "any" means no distance limit. */
export const eventSearchQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.union([z.literal("any"), z.coerce.number().int().min(1).max(RADIUS_X_MILES)]).optional(),
    from: localDate.optional(),
    to: localDate.optional(),
    /** Revival types, comma separated; an event matching any of them is included. */
    types: z
      .string()
      .max(400)
      .optional()
      .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []))
      .refine((v) => v.length <= REVIVAL_TYPE_SLUGS.length && v.every((s) => (REVIVAL_TYPE_SLUGS as string[]).includes(s)), "Unknown revival type"),
    organizationId: z.string().uuid().optional(),
    cursor: z.string().max(300).optional(),
    limit: z.coerce.number().int().min(1).max(SEARCH_LIMIT_MAX).default(SEARCH_LIMIT_DEFAULT),
  })
  .strict()
  .refine((q) => (q.lat === undefined) === (q.lng === undefined), { message: "Give both lat and lng, or neither", path: ["lat"] })
  .refine((q) => q.radius === undefined || q.radius === "any" || q.lat !== undefined, { message: "A radius needs a position", path: ["radius"] })
  .refine((q) => !q.from || !q.to || q.from <= q.to, { message: "The first date must not be after the last", path: ["from"] });
export type EventSearchQuery = z.infer<typeof eventSearchQuerySchema>;

/** An event as the public sees it. Never internal fields (status history, version, moderation). */
export const publicEventSchema = z.object({
  id: z.string().uuid(),
  organization: z.object({ id: z.string().uuid(), name: z.string() }),
  title: z.string(),
  description: z.string(),
  status: z.enum(["published", "cancelled"]),
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
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  revivalTypes: z.array(z.string()),
  speakers: z.string().nullable(),
  directions: z.string().nullable(),
  links: z.array(z.string()),
  /** Miles from the searched position, when one was given. */
  distanceMiles: z.number().nullable(),
});
export type PublicEvent = z.infer<typeof publicEventSchema>;

export const eventSearchResultSchema = z.object({ items: z.array(publicEventSchema), nextCursor: z.string().nullable() });
export type EventSearchResult = z.infer<typeof eventSearchResultSchema>;

export const publicEventParamsSchema = z.object({ id: z.string().uuid() });

// Place search: turns "Nashville, TN" or a ZIP code into positions, from data shipped with the app.
export const placeSearchQuerySchema = z.object({ q: z.string().trim().min(1).max(100) }).strict();
export const placeMatchSchema = z.object({ label: z.string(), lat: z.number(), lng: z.number() });
export const placeSearchResultSchema = z.object({ items: z.array(placeMatchSchema) });
export type PlaceSearchResult = z.infer<typeof placeSearchResultSchema>;
