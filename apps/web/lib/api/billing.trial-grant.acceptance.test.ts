import { describe, expect, it, vi } from "vitest";

import { createFakeBillingRepo, emptyBillingWorld } from "../../db/billing.fake";
import { createAdminDirectory } from "../auth/admin";
import { createFakePaymentProvider } from "../payments/fake";
import { createBillingService } from "../services/billing";
import { billingRoutes } from "./billing";
import { createApiRoute } from "./handler";

// Executable acceptance criteria for S13 trial grants (docs/features/s13-membership-and-trial-grants.md),
// verified at the API boundary with the real routes and service over the in-memory repo.
type Json = { ok: boolean; data: any; error?: { code: string; fieldErrors?: Record<string, string[]> } }; // eslint-disable-line @typescript-eslint/no-explicit-any
const DAY = 24 * 3600 * 1000;

describe("S13 trial grants (API boundary)", () => {
  const admin = `user_${"A".repeat(10)}`;
  const member = `user_${"M".repeat(10)}`;
  const stranger = `user_${"S".repeat(10)}`;

  const setup = () => {
    let clock = new Date("2026-10-12T12:00:00Z");
    const world = emptyBillingWorld();
    world.members.add(member);
    const repo = createFakeBillingRepo(world, () => clock);
    const service = createBillingService({ repo, admins: createAdminDirectory([admin]), provider: createFakePaymentProvider(), now: () => clock });
    const as = (userId: string | null) => {
      const routes = billingRoutes(createApiRoute({ getUserId: vi.fn().mockResolvedValue(userId), onUnexpected: vi.fn() }), () => service);
      const call = async (pending: Promise<Response>) => {
        const res = await pending;
        return { status: res.status, json: (await res.json()) as Json };
      };
      return {
        grant: (body: unknown) => call(routes.trials.PUT(new Request("http://localhost/api/v1/admin/billing/trials", { method: "PUT", body: JSON.stringify(body) }))),
        setRule: (body: unknown) => call(routes.rule.PUT(new Request("http://localhost/x", { method: "PUT", body: JSON.stringify(body) }), { params: Promise.resolve({ accountType: "member" }) })),
        entitlements: () => call(routes.entitlements.GET(new Request("http://localhost/api/v1/me/entitlements"))),
      };
    };
    return { world, service, as, get clock() { return clock; }, advance: (ms: number) => { clock = new Date(clock.getTime() + ms); } };
  };
  const good = { userId: member, days: 14, reason: "Asked for a second look after a missed email" };

  it("AC1: only an admin can grant a trial", async () => {
    const s = setup();
    expect((await s.as(null).grant(good)).status).toBe(401);
    expect((await s.as(member).grant(good)).status).toBe(404);
    expect(s.world.subscriptions.size).toBe(0);
    expect(s.world.audit).toHaveLength(0);
  });

  it("AC2: days, member id and reason are validated and nothing changes when they are wrong", async () => {
    const s = setup();
    const admin1 = s.as(admin);
    for (const bad of [{ ...good, days: 0 }, { ...good, days: -3 }, { ...good, days: 1.5 }, { ...good, days: 366 }, { ...good, reason: "   " }, { ...good, userId: "member" }, { ...good, extra: true }, { userId: member, days: 5 }]) {
      const res = await admin1.grant(bad);
      expect(res.status).toBe(400);
    }
    expect(s.world.subscriptions.size).toBe(0);
    expect(s.world.audit).toHaveLength(0);
  });

  it("AC3: a member with no subscription gets a trial ending the given days from now", async () => {
    const s = setup();
    const res = await s.as(admin).grant(good);
    expect(res.status).toBe(200);
    expect(res.json.data).toMatchObject({ status: "trialing", trialEndsAt: new Date(s.clock.getTime() + 14 * DAY).toISOString() });
  });

  it("AC3: a running trial, an ended trial and a cancelled subscription all get the new end", async () => {
    const s = setup();
    for (const status of ["trialing", "cancelled"]) {
      s.world.subscriptions.set(`member:${member}`, { id: "row", accountType: "member", accountId: member, planId: null, priceId: null, status, trialEndsAt: new Date(s.clock.getTime() - 5 * DAY), providerRef: null, providerCustomerRef: null, providerEventAt: null, createdAt: s.clock });
      const res = await s.as(admin).grant({ ...good, days: 7 });
      expect(res.status).toBe(200);
      expect(res.json.data.status).toBe("trialing");
      expect(res.json.data.trialEndsAt).toBe(new Date(s.clock.getTime() + 7 * DAY).toISOString());
    }
  });

  it("AC4: a member who has paid (active or past due) is refused and nothing changes", async () => {
    const s = setup();
    for (const status of ["active", "past_due"]) {
      s.world.subscriptions.set(`member:${member}`, { id: "row", accountType: "member", accountId: member, planId: null, priceId: null, status, trialEndsAt: null, providerRef: "sub_1", providerCustomerRef: null, providerEventAt: null, createdAt: s.clock });
      const res = await s.as(admin).grant(good);
      expect(res.status).toBe(409);
      expect(s.world.subscriptions.get(`member:${member}`)?.status).toBe(status);
    }
    expect(s.world.audit).toHaveLength(0);
  });

  it("AC5: a member who does not exist is not found and nothing is created", async () => {
    const s = setup();
    const res = await s.as(admin).grant({ ...good, userId: stranger });
    expect(res.status).toBe(404);
    expect(s.world.subscriptions.size).toBe(0);
  });

  it("AC6: a grant writes one audit entry with the actor, the member, the days and the reason", async () => {
    const s = setup();
    await s.as(admin).grant(good);
    expect(s.world.audit).toHaveLength(1);
    const entry = s.world.audit[0];
    expect(entry).toMatchObject({ actorId: admin, action: "billing.trial.grant", subject: `member:${member}` });
    expect(JSON.parse(entry.detail)).toMatchObject({ days: 14, reason: good.reason });
  });

  it("AC7: the member is entitled until the new end and not after it, when payment is required", async () => {
    const s = setup();
    await s.as(admin).setRule({ paymentRequired: true, trialDays: 0, defaultPlanId: null });
    expect((await s.service.entitlementFor("member", member)).entitled).toBe(false); // no trial configured, nothing granted yet
    await s.as(admin).grant({ ...good, days: 3 });
    const during = await s.as(member).entitlements();
    expect(during.json.data.items[0]).toMatchObject({ entitled: true, reason: "trialing" });
    s.advance(3 * DAY);
    expect((await s.as(member).entitlements()).json.data.items[0]).toMatchObject({ entitled: false, reason: "trial_ended" }); // it ends AT the end instant
  });
});
