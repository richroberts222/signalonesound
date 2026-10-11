import { z } from "zod";

// S16 FIRE MAP (docs/features/s16-fire-map.md): the public map of revival fires. Computed on the server; the
// clients draw it. Land under fire is a percentage with up to four decimals; counts are whole numbers.

export const fireSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** "City, ST", shown beside the fire. */
  place: z.string(),
  lat: z.number(),
  lng: z.number(),
});

export const fireRegionSchema = z.object({
  name: z.string(),
  events: z.array(z.object({ id: z.string(), title: z.string() })),
});

export const fireViewSchema = z.object({
  fires: z.number().int().nonnegative(),
  regionsWithFire: z.number().int().nonnegative(),
  regionsTotal: z.number().int().positive(),
  landPercent: z.number().nonnegative(),
  regions: z.array(fireRegionSchema),
});

export const fireMapSchema = z.object({
  asOf: z.string(),
  fires: z.array(fireSchema),
  world: fireViewSchema,
  us: fireViewSchema,
});

export type Fire = z.infer<typeof fireSchema>;
export type FireView = z.infer<typeof fireViewSchema>;
export type FireMap = z.infer<typeof fireMapSchema>;
