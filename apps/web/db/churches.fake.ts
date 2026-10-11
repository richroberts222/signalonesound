import type { ChurchAudit, ChurchCursor, ChurchProfileRow, ChurchSearch, ChurchSearchRow, ChurchServiceRow, ChurchesRepo, NewChurchProfile, NewChurchService } from "./churches";

// An in-memory ChurchesRepo for unit and acceptance tests (docs/testing.md): the same rules as the real queries, with the
// same keyset order. Which organizations are approved, and their names, come from `orgInfo`, as the real query joins them.
type OrgInfo = { name: string; status: string };

const miles = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const cos = Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng) - rad(a.lng)) + Math.sin(rad(a.lat)) * Math.sin(rad(b.lat));
  return Math.round(3958.8 * Math.acos(Math.min(1, Math.max(-1, cos))) * 100) / 100;
};

export function createFakeChurchesRepo(now: () => Date = () => new Date(), orgInfo: (orgId: string) => OrgInfo | undefined = () => ({ name: "Sample Fellowship", status: "approved" })) {
  const profiles = new Map<string, ChurchProfileRow>();
  const services = new Map<string, ChurchServiceRow[]>();
  const audit: (ChurchAudit & { at: Date })[] = [];
  let failNext = false;

  const repo = {
    async getProfile(orgId: string): Promise<ChurchProfileRow | null> {
      const p = profiles.get(orgId);
      return p ? { ...p } : null;
    },
    async listServices(orgIds: string[]): Promise<ChurchServiceRow[]> {
      return orgIds.flatMap((id) => (services.get(id) ?? []).map((s) => ({ ...s })));
    },
    async saveProfile(profile: NewChurchProfile, entry: ChurchAudit): Promise<void> {
      if (failNext) {
        failNext = false;
        throw new Error("simulated failure");
      }
      profiles.set(profile.orgId, { ...profile, updatedAt: now() });
      audit.push({ ...entry, at: now() });
    },
    async saveServices(orgId: string, list: NewChurchService[], entry: ChurchAudit): Promise<void> {
      if (failNext) {
        failNext = false;
        throw new Error("simulated failure");
      }
      services.set(
        orgId,
        list.map((s, position) => ({ id: crypto.randomUUID(), orgId, position, ...s })),
      );
      audit.push({ ...entry, at: now() });
    },
    async search(p: ChurchSearch): Promise<ChurchSearchRow[]> {
      const words = (p.q ?? "").split(/\s+/).filter(Boolean).slice(0, 5).map((w) => w.toLowerCase());
      const rows: ChurchSearchRow[] = [];
      for (const profile of profiles.values()) {
        const org = orgInfo(profile.orgId);
        if (!org || org.status !== "approved") continue;
        let distance: number | null = null;
        if (p.position) {
          if (profile.lat === null || profile.lng === null) continue;
          distance = miles(p.position, { lat: profile.lat, lng: profile.lng });
          if (distance > p.radius) continue;
        }
        if (!words.every((w) => org.name.toLowerCase().includes(w) || profile.city.toLowerCase().includes(w))) continue;
        rows.push({ id: profile.orgId, name: org.name, city: profile.city, state: profile.state, country: profile.country, timeZone: profile.timeZone, distance });
      }
      const order = (a: ChurchSearchRow, b: ChurchSearchRow) =>
        (p.position ? (a.distance as number) - (b.distance as number) : 0) || a.name.localeCompare(b.name, "en") || a.id.localeCompare(b.id);
      rows.sort(order);
      const after = (c: ChurchCursor | null) => (c ? rows.filter((r) => order(r, { id: c.id, name: c.name, distance: c.distance, city: "", state: "", country: "", timeZone: "" }) > 0) : rows);
      return after(p.cursor).slice(0, p.limit + 1);
    },
  };

  return Object.assign(repo, {
    audit,
    /** Makes the next save fail, to prove that a failed save changes nothing. */
    failNextSave: () => {
      failNext = true;
    },
  }) as ChurchesRepo & { audit: typeof audit; failNextSave: () => void };
}
