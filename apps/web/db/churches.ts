import { and, asc, eq, ilike, inArray, isNotNull, or, sql } from "drizzle-orm";

import type { Database } from "./client";
import { withDbErrors } from "./errors";
import { auditLog, churchProfile, churchService, organization } from "./schema";

// Data access for churches (S18, docs/features/s18-find-a-church.md): a church's public profile and its regular weekly
// services, and the public search. Public information (T0). Server-only by convention (like all of db/): it owns the
// Drizzle queries and DatabaseError wrapping and returns its own row types, which the service maps to the public contract.
// Saving the services replaces the whole list in one atomic batch together with the audit entry.
export type ChurchProfileRow = typeof churchProfile.$inferSelect;
export type ChurchServiceRow = typeof churchService.$inferSelect;
export type ChurchAudit = { actorId: string; action: string; subject: string; detail?: string };

export type NewChurchProfile = { orgId: string; street: string; city: string; state: string; zip: string; country: string; lat: number | null; lng: number | null; timeZone: string };
export type NewChurchService = { weekday: number; startTime: string; label: string; note: string };

export type ChurchCursor = { distance: number | null; name: string; id: string };
export type ChurchSearch = {
  /** A word or phrase matched against the church name or city; null for none. */
  q: string | null;
  position: { lat: number; lng: number } | null;
  /** Miles; used only with a position. */
  radius: number;
  cursor: ChurchCursor | null;
  limit: number;
};
export type ChurchSearchRow = { id: string; name: string; city: string; state: string; country: string; timeZone: string; distance: number | null };

export type ChurchesRepo = ReturnType<typeof createChurchesRepo>;

/** Escapes % and _ so a typed word is matched as itself in a LIKE pattern. */
const likePattern = (word: string): string => `%${word.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export function createChurchesRepo(db: Database) {
  type Batch = Parameters<Database["batch"]>[0];

  return {
    getProfile: (orgId: string): Promise<ChurchProfileRow | null> =>
      withDbErrors("church.getProfile", async () => {
        const [row] = await db.select().from(churchProfile).where(eq(churchProfile.orgId, orgId)).limit(1);
        return row ?? null;
      }),

    /** The services of several churches at once, in each church's own order. */
    listServices: (orgIds: string[]): Promise<ChurchServiceRow[]> =>
      withDbErrors("church.listServices", async () => {
        if (orgIds.length === 0) return [];
        return db.select().from(churchService).where(inArray(churchService.orgId, orgIds)).orderBy(asc(churchService.orgId), asc(churchService.position));
      }),

    /** Creates or replaces a church's profile, with the audit entry, in one atomic step. */
    saveProfile: (profile: NewChurchProfile, audit: ChurchAudit): Promise<void> =>
      withDbErrors("church.saveProfile", async () => {
        const values = { ...profile, updatedAt: new Date() };
        await db.batch([
          db.insert(churchProfile).values(values).onConflictDoUpdate({ target: churchProfile.orgId, set: { ...values } }),
          db.insert(auditLog).values({ ...audit, detail: audit.detail ?? "" }),
        ] as unknown as Batch);
      }),

    /** Replaces the whole list of services, with the audit entry, in one atomic step: a failure changes nothing. */
    saveServices: (orgId: string, services: NewChurchService[], audit: ChurchAudit): Promise<void> =>
      withDbErrors("church.saveServices", async () => {
        const rows = services.map((s, position) => ({ orgId, position, ...s }));
        await db.batch([
          db.delete(churchService).where(eq(churchService.orgId, orgId)),
          ...(rows.length > 0 ? [db.insert(churchService).values(rows)] : []),
          db.insert(auditLog).values({ ...audit, detail: audit.detail ?? "" }),
        ] as unknown as Batch);
      }),

    /**
     * The public search: approved churches that have a profile. By text, the name or city contains the words typed. By
     * position, only churches with a pin, within the radius (a bounding box first, then the great-circle distance), nearest
     * first; with no position the order is by name. Keyset-paged: the order ends in the id, so paging never repeats or
     * skips. Nothing about the searcher is stored.
     */
    search: (p: ChurchSearch): Promise<ChurchSearchRow[]> =>
      withDbErrors("church.search", async () => {
        const pos = p.position;
        const distance = pos
          ? sql<number>`round((3958.8 * acos(least(1, greatest(-1, cos(radians(${pos.lat})) * cos(radians(${churchProfile.lat})) * cos(radians(${churchProfile.lng}) - radians(${pos.lng})) + sin(radians(${pos.lat})) * sin(radians(${churchProfile.lat}))))))::numeric, 2)::float8`
          : sql<number | null>`null::float8`;
        const where = [eq(organization.status, "approved")];
        if (pos) {
          const dLat = p.radius / 69;
          const dLng = p.radius / (69 * Math.max(0.01, Math.cos((pos.lat * Math.PI) / 180)));
          where.push(
            isNotNull(churchProfile.lat),
            isNotNull(churchProfile.lng),
            sql`${churchProfile.lat} between ${pos.lat - dLat} and ${pos.lat + dLat}`,
            sql`${churchProfile.lng} between ${pos.lng - dLng} and ${pos.lng + dLng}`,
            sql`${distance} <= ${p.radius}`,
          );
        }
        if (p.q) {
          for (const word of p.q.split(/\s+/).filter(Boolean).slice(0, 5)) {
            where.push(or(ilike(organization.name, likePattern(word)), ilike(churchProfile.city, likePattern(word)))!);
          }
        }
        if (p.cursor) {
          where.push(
            pos
              ? sql`(${distance}, ${organization.name}, ${organization.id}) > (${p.cursor.distance ?? 0}::float8, ${p.cursor.name}, ${p.cursor.id}::uuid)`
              : sql`(${organization.name}, ${organization.id}) > (${p.cursor.name}, ${p.cursor.id}::uuid)`,
          );
        }
        const rows = await db
          .select({ id: organization.id, name: organization.name, city: churchProfile.city, state: churchProfile.state, country: churchProfile.country, timeZone: churchProfile.timeZone, distance })
          .from(churchProfile)
          .innerJoin(organization, eq(organization.id, churchProfile.orgId))
          .where(and(...where))
          .orderBy(...(pos ? [asc(distance), asc(organization.name), asc(organization.id)] : [asc(organization.name), asc(organization.id)]))
          .limit(p.limit + 1);
        return rows.map((r) => ({ ...r, distance: r.distance ?? null }));
      }),
  };
}
