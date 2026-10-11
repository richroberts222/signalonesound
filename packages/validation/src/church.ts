import { parseLocalDateTime, utcToLocalString } from "@signalone/shared";
import { z } from "zod";

import { COUNTRY_CODES, countryName } from "./countries";
import { addressProblems, pinSchema, US_STATES } from "./event";
import { isTimeZone } from "./profile";

// S18 FIND A CHURCH (docs/features/s18-find-a-church.md). Public wire contracts for a church's profile (where it is),
// its regular weekly services, and the public search. Public church information (data tier T0). Independent of
// database row types and shared by web and mobile.

export const MAX_SERVICES = 20;
export const SERVICE_LABEL_MAX = 60;
export const SERVICE_NOTE_MAX = 200;
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const codePoints = (value: string): number => [...value].length;
const hasControlCharacter = (value: string): boolean =>
  [...value].some((char) => {
    const code = char.codePointAt(0) ?? 0;
    return code < 32 || code === 127 || (code >= 128 && code < 160);
  });
const line = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .refine((v) => codePoints(v) >= min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .refine((v) => codePoints(v) <= max, `${label} must be at most ${max} characters`)
    .refine((v) => !hasControlCharacter(v), `${label} must be plain text on one line`);

// ---------- regular services ----------

/** One regular weekly service. */
export const serviceSchema = z
  .object({
    weekday: z.number({ error: "Choose a day" }).int("Choose a day").min(0, "Choose a day").max(6, "Choose a day"),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a time like 10:00 or 19:30"),
    label: line("Name", 1, SERVICE_LABEL_MAX),
    note: line("Note", 0, SERVICE_NOTE_MAX).default(""),
  })
  .strict();
export type ServiceInput = z.infer<typeof serviceSchema>;

/** Replace a church's whole list of regular services (at most 20; the same service twice is refused). */
export const saveServicesSchema = z
  .object({ services: z.array(serviceSchema).max(MAX_SERVICES, `Add at most ${MAX_SERVICES} services`) })
  .strict()
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.services.forEach((s, i) => {
      const key = `${s.weekday}|${s.startTime}|${s.label.toLowerCase()}`;
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: ["services", i], message: "This service is listed twice" });
      seen.add(key);
    });
  });
export type SaveServicesInput = z.infer<typeof saveServicesSchema>;

// ---------- profile ----------

/** A church's address, pin and time zone. The same address rules as an event (S17): a US state and ZIP, or elsewhere a free-text region. */
export const saveChurchProfileSchema = z
  .object({
    country: z.enum(COUNTRY_CODES, { error: "Choose a country" }).default("US"),
    /** Optional: a house church may leave it blank and show only its city. */
    street: line("Street", 0, 120).default(""),
    city: line("City", 1, 80),
    state: z.enum([...US_STATES, ""], { error: "Choose a state" }).default(""),
    region: line("Region", 0, 80).optional(),
    zip: line("ZIP or postal code", 0, 20).default(""),
    timeZone: z.string().refine(isTimeZone, "Choose a time zone"),
    /** The pin from the location picker; null removes it. */
    location: pinSchema.nullable().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const problems = addressProblems(value);
    for (const [field, messages] of Object.entries(problems ?? {})) for (const message of messages) ctx.addIssue({ code: "custom", path: [field], message });
  });
export type SaveChurchProfileInput = z.infer<typeof saveChurchProfileSchema>;

export const churchProfileSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  country: z.string(),
  timeZone: z.string(),
  location: pinSchema.nullable(),
});
export type ChurchProfile = z.infer<typeof churchProfileSchema>;

export const churchServiceSchema = z.object({ weekday: z.number().int(), startTime: z.string(), label: z.string(), note: z.string() });
export type ChurchService = z.infer<typeof churchServiceSchema>;

/** A church as the public sees it. `profile` is null until a manager adds the address. */
export const churchSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  links: z.array(z.string()),
  profile: churchProfileSchema.nullable(),
  services: z.array(churchServiceSchema),
});
export type Church = z.infer<typeof churchSchema>;

// ---------- search ----------

export const MAX_CHURCH_RADIUS = 500;
export const churchSearchQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().min(1).max(MAX_CHURCH_RADIUS).default(25),
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), { message: "Give both lat and lng, or neither", path: ["lat"] });
export type ChurchSearchQuery = z.infer<typeof churchSearchQuerySchema>;

/** One service in the "next services" line of a result. */
export const nextServiceSchema = z.object({ weekday: z.number().int(), startTime: z.string(), label: z.string() });
export type NextService = z.infer<typeof nextServiceSchema>;

export const churchResultSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  city: z.string(),
  state: z.string(),
  country: z.string(),
  distanceMiles: z.number().nullable(),
  nextServices: z.array(nextServiceSchema),
  serviceCount: z.number().int(),
});
export type ChurchResult = z.infer<typeof churchResultSchema>;
export const churchSearchResultSchema = z.object({ items: z.array(churchResultSchema), nextCursor: z.string().nullable() });
export type ChurchSearchResult = z.infer<typeof churchSearchResultSchema>;

export const churchParamsSchema = z.object({ id: z.string().uuid() });
export const savedServicesSchema = z.object({ services: z.array(churchServiceSchema) });

// ---------- pure helpers shared by web and phone ----------

/** "10:00 AM", "7:30 PM", "12:00 PM" (noon) and "12:00 AM" (midnight), from "HH:MM". A malformed value is returned as typed. */
export function formatServiceTime(startTime: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(startTime);
  if (!m) return startTime;
  const hour = Number(m[1]);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${m[2]} ${hour < 12 ? "AM" : "PM"}`;
}

/** "Sunday, 10:00 AM". */
export const formatServiceWhen = (weekday: number, startTime: string): string => `${WEEKDAYS[weekday] ?? "Day"}, ${formatServiceTime(startTime)}`;

/** Sunday first, then by time, then by name: the order services are shown in. */
export function sortServices<T extends { weekday: number; startTime: string; label: string }>(services: T[]): T[] {
  return [...services].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime) || a.label.localeCompare(b.label));
}

/**
 * The next services from `now`, in the church's own time zone: the soonest first, a service later today before the same
 * one next week, up to `count`. Pure, so the same answer is given on the server and in a test.
 */
export function nextServices<T extends { weekday: number; startTime: string }>(services: T[], now: Date, timeZone: string, count = 3): T[] {
  const local = parseLocalDateTime(utcToLocalString(now, timeZone));
  if (!local) return [];
  const nowWeekday = new Date(Date.UTC(local.year, local.month - 1, local.day)).getUTCDay();
  const nowMinutes = local.hour * 60 + local.minute;
  const WEEK = 7 * 24 * 60;
  const minutesUntil = (s: T): number => {
    const [h, m] = s.startTime.split(":").map(Number);
    const until = ((s.weekday - nowWeekday + 7) % 7) * 24 * 60 + (h * 60 + m - nowMinutes);
    return until < 0 ? until + WEEK : until;
  };
  return [...services].sort((a, b) => minutesUntil(a) - minutesUntil(b)).slice(0, count);
}

/** "Springfield, MO" in the United States and "Kibera, Kenya" elsewhere. */
export const churchPlace = (city: string, state: string, country: string): string => (country === "US" ? `${city}, ${state}` : `${city}, ${countryName(country)}`);

/** Where "Directions" opens: a map search for the address (street included when there is one). */
export function directionsUrl(p: Pick<ChurchProfile, "street" | "city" | "state" | "zip" | "country" | "location">): string {
  const query = p.location ? `${p.location.lat},${p.location.lng}` : [p.street, p.city, p.state, p.zip, countryName(p.country)].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

