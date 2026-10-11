import {
  churchSearchQuerySchema,
  nextServices,
  sortServices,
  storedState,
  type Church,
  type ChurchProfile,
  type ChurchSearchQuery,
  type ChurchSearchResult,
  type SaveChurchProfileInput,
  type SaveServicesInput,
} from "@signalone/validation";

import type { ChurchCursor, ChurchProfileRow, ChurchServiceRow, ChurchesRepo } from "../../db/churches";
import type { ServiceContext } from "./context";
import { notFound, validationFailed } from "./errors";
import type { AdminDirectory } from "./organizations";

// Service for churches (S18, docs/features/s18-find-a-church.md). Public: anyone may search and read an approved church
// with its address and regular services. Only an approved manager of the church (or an admin) may save its profile and
// services; anyone else is told "not found" and nothing is revealed. Every save is audited in the same atomic step as the
// change. A church that is not approved never appears. Framework-free; the repo, the organization read, the manager check
// and the clock are injected.
export type ChurchesServiceDeps = {
  repo: ChurchesRepo;
  /** The public view of an APPROVED organization; throws "not found" for anything else. */
  getPublicOrganization: (orgId: string) => Promise<{ id: string; name: string; description: string; links: string[] }>;
  /** Is this person an approved manager of the organization? */
  isManager: (orgId: string, userId: string) => Promise<boolean>;
  admins: AdminDirectory;
  requireAccepted: (userId: string) => Promise<void>;
  now?: () => Date;
};

export type ChurchesService = ReturnType<typeof createChurchesService>;

const encodeCursor = (c: ChurchCursor): string => Buffer.from(JSON.stringify(c), "utf8").toString("base64url");
function decodeCursor(value: string): ChurchCursor {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as ChurchCursor;
    if (typeof parsed.name !== "string" || !/^[0-9a-f-]{36}$/.test(parsed.id) || (parsed.distance !== null && typeof parsed.distance !== "number")) throw new Error("bad cursor");
    return parsed;
  } catch {
    throw validationFailed("Invalid cursor");
  }
}

const profileView = (row: ChurchProfileRow): ChurchProfile => ({
  street: row.street,
  city: row.city,
  state: row.state,
  zip: row.zip,
  country: row.country,
  timeZone: row.timeZone,
  location: row.lat !== null && row.lng !== null ? { lat: row.lat, lng: row.lng } : null,
});

const serviceView = (s: ChurchServiceRow) => ({ weekday: s.weekday, startTime: s.startTime, label: s.label, note: s.note });

export function createChurchesService({ repo, getPublicOrganization, isManager, admins, requireAccepted, now = () => new Date() }: ChurchesServiceDeps) {
  const mayManage = async (ctx: ServiceContext, orgId: string): Promise<boolean> => admins.isAdmin(ctx.actor.userId) || (await isManager(orgId, ctx.actor.userId));

  return {
    /** One approved church with its address and regular services, in the order they are shown. */
    async get(id: string): Promise<Church> {
      const org = await getPublicOrganization(id);
      const [profile, services] = await Promise.all([repo.getProfile(id), repo.listServices([id])]);
      return {
        id: org.id,
        name: org.name,
        description: org.description,
        links: org.links,
        profile: profile ? profileView(profile) : null,
        services: sortServices(services.map(serviceView)),
      };
    },

    /** The public search: by text, or by position and radius (nearest first), with each church's next services. */
    async search(input: ChurchSearchQuery): Promise<ChurchSearchResult> {
      const query = churchSearchQuerySchema.parse(input);
      const rows = await repo.search({
        q: query.q && query.q !== "" ? query.q : null,
        position: query.lat !== undefined && query.lng !== undefined ? { lat: query.lat, lng: query.lng } : null,
        radius: query.radius,
        cursor: query.cursor ? decodeCursor(query.cursor) : null,
        limit: query.limit,
      });
      const page = rows.slice(0, query.limit);
      const services = await repo.listServices(page.map((r) => r.id));
      const at = now();
      const last = page[page.length - 1];
      return {
        items: page.map((r) => {
          const own = services.filter((s) => s.orgId === r.id).map(serviceView);
          return {
            id: r.id,
            name: r.name,
            city: r.city,
            state: r.state,
            country: r.country,
            distanceMiles: r.distance,
            nextServices: nextServices(own, at, r.timeZone, 3).map((s) => ({ weekday: s.weekday, startTime: s.startTime, label: s.label })),
            serviceCount: own.length,
          };
        }),
        nextCursor: rows.length > query.limit && last ? encodeCursor({ distance: last.distance, name: last.name, id: last.id }) : null,
      };
    },

    /** Saves the church's address, pin and time zone. A pin that is left out is kept; null removes it. */
    async saveProfile(ctx: ServiceContext, orgId: string, input: SaveChurchProfileInput): Promise<ChurchProfile> {
      await requireAccepted(ctx.actor.userId);
      if (!(await mayManage(ctx, orgId))) throw notFound();
      const existing = await repo.getProfile(orgId);
      const pin = input.location !== undefined ? input.location : existing && existing.lat !== null && existing.lng !== null ? { lat: existing.lat, lng: existing.lng } : null;
      const row = {
        orgId,
        street: input.street,
        city: input.city,
        state: storedState(input.country, input.state, input.region),
        zip: input.zip,
        country: input.country,
        lat: pin?.lat ?? null,
        lng: pin?.lng ?? null,
        timeZone: input.timeZone,
      };
      await repo.saveProfile(row, { actorId: ctx.actor.userId, action: "church.profile.save", subject: `organization:${orgId}`, detail: pin ? "with a pin" : "without a pin" });
      return profileView({ ...row, updatedAt: now() });
    },

    /** Replaces the whole list of regular services, Sunday first, in one atomic step. */
    async saveServices(ctx: ServiceContext, orgId: string, input: SaveServicesInput): Promise<{ services: ReturnType<typeof serviceView>[] }> {
      await requireAccepted(ctx.actor.userId);
      if (!(await mayManage(ctx, orgId))) throw notFound();
      const sorted = sortServices(input.services);
      await repo.saveServices(orgId, sorted, { actorId: ctx.actor.userId, action: "church.services.save", subject: `organization:${orgId}`, detail: `${sorted.length} service(s)` });
      return { services: sorted };
    },
  };
}

