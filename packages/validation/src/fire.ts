import { z } from "zod";

// S19 FIRE (docs/features/s19-fire-recommend.md). A fire is a one-tap recommendation of an event. The
// total is public (it is `fireCount` on every public event); who gave a fire is never shown to anyone.

/** The most new fires one member can give in any 24 hours. */
export const MAX_FIRES_PER_DAY = 100;
/** A fire is removed this many days after the event ended. */
export const FIRE_RETENTION_DAYS = 30;

export const fireParamsSchema = z.object({ eventId: z.string().uuid() });
export const fireResultSchema = z.object({ eventId: z.string().uuid(), fired: z.boolean() });
export type FireResult = z.infer<typeof fireResultSchema>;

/** "1 fire", "3 fires": the text equivalent of the count, for screen readers and plain text. */
export function formatFireCount(count: number): string {
  return `${count} ${count === 1 ? "fire" : "fires"}`;
}
