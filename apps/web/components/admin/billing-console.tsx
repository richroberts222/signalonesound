"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  createApiClient,
  createBillingClient,
  type AccountType,
  type BillingAuditEntry,
  type BillingRule,
  type Coupon,
  type Plan,
} from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { formatMinor, parseDollarsToMinor } from "@/lib/billing/money";

type Outcome = { ok: boolean; error?: { message: string; fieldErrors?: Record<string, string[]> } };
type RuleDraft = { paymentRequired: boolean; trialDays: string; defaultPlanId: string };

const TYPE_LABEL: Record<AccountType, string> = { member: "Members", organization: "Churches and ministries" };
const draftOf = (rule: BillingRule): RuleDraft => ({ paymentRequired: rule.paymentRequired, trialDays: String(rule.trialDays), defaultPlanId: rule.defaultPlanId ?? "" });

// The platform admin's billing console (S10): who pays, for how long a free trial runs, which plans exist
// and what they cost, and which promotional coupons work. Everything here is read and enforced by the
// server; every change is written to the audit log. Nothing takes a payment: the payment provider is not
// connected yet. Anyone who is not an admin gets "not found" from the API and sees nothing here.
export function BillingConsole() {
  const client = useMemo(() => createBillingClient(createApiClient({ baseUrl: "" })).admin, []);
  const [rules, setRules] = useState<BillingRule[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, RuleDraft>>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [audit, setAudit] = useState<BillingAuditEntry[]>([]);
  const [newPlan, setNewPlan] = useState({ accountType: "member" as AccountType, name: "", interval: "month" as "month" | "year", amount: "" });
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [newCoupon, setNewCoupon] = useState({ code: "", kind: "percent" as "percent" | "amount", value: "", expires: "", limit: "" });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [r, p, c, a] = await Promise.all([client.listRules(), client.listPlans(), client.listCoupons(), client.listAudit(30)]);
    if (!r.ok) return setError(r.error.code === "not_found" ? "This page is only for platform admins." : r.error.message);
    setRules(r.data.items);
    setDrafts(Object.fromEntries(r.data.items.map((rule) => [rule.accountType, draftOf(rule)])));
    if (p.ok) setPlans(p.data.items);
    if (c.ok) setCoupons(c.data.items);
    if (a.ok) setAudit(a.data.items);
  }, [client]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the API
    void load();
  }, [load]);

  async function act(run: () => Promise<Outcome>, message: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await run();
    if (result.ok) {
      setNotice(message);
      await load();
    } else {
      const fields = result.error?.fieldErrors;
      setError((fields && Object.values(fields)[0]?.[0]) ?? result.error?.message ?? "Something went wrong");
    }
    setBusy(false);
  }

  const planName = (id: string | null) => plans.find((p) => p.id === id)?.name ?? "No default plan";

  function saveRule(type: AccountType) {
    const d = drafts[type];
    const trialDays = Number(d.trialDays);
    if (!Number.isInteger(trialDays)) return setError("Trial days must be a whole number.");
    void act(() => client.updateRule(type, { paymentRequired: d.paymentRequired, trialDays, defaultPlanId: d.defaultPlanId || null }), `${TYPE_LABEL[type]} settings saved.`);
  }

  function createPlan() {
    const amountMinor = parseDollarsToMinor(newPlan.amount);
    if (amountMinor === null) return setError("Enter the price in dollars, like 3 or 3.50 (up to $10,000).");
    void act(() => client.createPlan({ accountType: newPlan.accountType, name: newPlan.name, interval: newPlan.interval, amountMinor, currency: "usd" }), "Plan created. It is inactive until you turn it on.").then(() => setNewPlan({ ...newPlan, name: "", amount: "" }));
  }

  function changePrice(plan: Plan) {
    const amountMinor = parseDollarsToMinor(priceEdits[plan.id] ?? "");
    if (amountMinor === null || !plan.price) return setError("Enter the new price in dollars, like 3 or 3.50 (up to $10,000).");
    void act(() => client.updatePlan(plan.id, { price: { interval: plan.price!.interval, amountMinor, currency: plan.price!.currency } }), "New price saved. Current subscribers keep the price they bought.").then(() => setPriceEdits({ ...priceEdits, [plan.id]: "" }));
  }

  function createCoupon() {
    const value = newCoupon.kind === "percent" ? Number(newCoupon.value) : parseDollarsToMinor(newCoupon.value);
    if (value === null || !Number.isFinite(value) || newCoupon.value.trim() === "") return setError(newCoupon.kind === "percent" ? "Enter a whole percentage from 1 to 100." : "Enter the discount in dollars, like 5 or 5.50.");
    const limit = newCoupon.limit.trim() === "" ? undefined : Number(newCoupon.limit);
    void act(
      () =>
        client.createCoupon({
          code: newCoupon.code,
          ...(newCoupon.kind === "percent" ? { percentOff: value } : { amountOffMinor: value, currency: "usd" as const }),
          ...(newCoupon.expires ? { expiresAt: new Date(newCoupon.expires).toISOString() } : {}),
          ...(limit !== undefined ? { maxRedemptions: limit } : {}),
        }),
      "Coupon created.",
    ).then(() => setNewCoupon({ ...newCoupon, code: "", value: "", expires: "", limit: "" }));
  }

  return (
    <div className="flex w-full max-w-4xl flex-col gap-6">
      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="billing-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground" data-testid="billing-notice">
          {notice}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        These settings decide who must pay. Payment is off for everyone until you turn it on. No payment provider is connected yet, so nothing here charges anyone.
      </p>

      <section aria-labelledby="rules-heading" className="flex flex-col gap-3">
        <h2 id="rules-heading" className="font-heading text-xl font-bold">
          Who pays
        </h2>
        {rules?.map((rule) => {
          const type = rule.accountType;
          const d = drafts[type] ?? draftOf(rule);
          const set = (patch: Partial<RuleDraft>) => setDrafts({ ...drafts, [type]: { ...d, ...patch } });
          return (
            <Card key={type}>
              <CardHeader>
                <CardTitle>{TYPE_LABEL[type]}</CardTitle>
                <CardDescription>{rule.paymentRequired ? "Payment is required." : "Free: payment is skipped."} Default plan: {planName(rule.defaultPlanId)}.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox id={`required-${type}`} checked={d.paymentRequired} onCheckedChange={(checked) => set({ paymentRequired: checked === true })} data-testid={`billing-required-${type}`} />
                  <Label htmlFor={`required-${type}`}>Payment is required</Label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`trial-${type}`}>Free trial (days, 0 for none)</Label>
                    <Input id={`trial-${type}`} inputMode="numeric" value={d.trialDays} onChange={(e) => set({ trialDays: e.target.value })} data-testid={`billing-trial-days-${type}`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor={`default-plan-${type}`}>Default plan</Label>
                    <NativeSelect id={`default-plan-${type}`} value={d.defaultPlanId} onChange={(e) => set({ defaultPlanId: e.target.value })} data-testid={`billing-default-plan-${type}`}>
                      <option value="">No default plan</option>
                      {plans.filter((p) => p.accountType === type).map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </div>
                </div>
                <div>
                  <Button size="sm" disabled={busy} onClick={() => saveRule(type)} data-testid={`billing-save-${type}`}>
                    Save {TYPE_LABEL[type].toLowerCase()} settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section aria-labelledby="plans-heading" className="flex flex-col gap-3">
        <h2 id="plans-heading" className="font-heading text-xl font-bold">
          Plans
        </h2>
        {plans.length === 0 && <p data-testid="plans-empty">No plans yet.</p>}
        <ul className="flex flex-col gap-3">
          {plans.map((plan, i) => (
            <li key={plan.id}>
              <Card size="sm">
                <CardHeader>
                  <CardTitle data-testid={`plan-name-${i}`}>{plan.name}</CardTitle>
                  <CardDescription>
                    {TYPE_LABEL[plan.accountType]} &middot; {plan.price ? `${formatMinor(plan.price.amountMinor, plan.price.currency)} per ${plan.price.interval}` : "No price"} &middot; {plan.active ? "Active" : "Inactive"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id={`plan-active-${plan.id}`} checked={plan.active} disabled={busy} onCheckedChange={(checked) => void act(() => client.updatePlan(plan.id, { active: checked === true }), checked === true ? "Plan turned on." : "Plan turned off.")} data-testid={`plan-active-${i}`} />
                    <Label htmlFor={`plan-active-${plan.id}`}>Active (people can subscribe)</Label>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`plan-price-${plan.id}`}>New price (dollars)</Label>
                      <Input id={`plan-price-${plan.id}`} inputMode="decimal" className="w-32" value={priceEdits[plan.id] ?? ""} onChange={(e) => setPriceEdits({ ...priceEdits, [plan.id]: e.target.value })} data-testid={`plan-price-${i}`} />
                    </div>
                    <Button variant="outline" size="sm" disabled={busy} onClick={() => changePrice(plan)} data-testid={`plan-edit-${i}`}>
                      Change price
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        <Card>
          <CardHeader>
            <CardTitle>New plan</CardTitle>
            <CardDescription>It starts inactive. Turn it on when you are ready.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-name">Name</Label>
              <Input id="plan-name" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} data-testid="plan-name" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-type">Who it is for</Label>
              <NativeSelect id="plan-type" value={newPlan.accountType} onChange={(e) => setNewPlan({ ...newPlan, accountType: e.target.value as AccountType })} data-testid="plan-account-type">
                <option value="member">Members</option>
                <option value="organization">Churches and ministries</option>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-interval">Billed</Label>
              <NativeSelect id="plan-interval" value={newPlan.interval} onChange={(e) => setNewPlan({ ...newPlan, interval: e.target.value as "month" | "year" })} data-testid="plan-interval">
                <option value="month">Every month</option>
                <option value="year">Every year</option>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-amount">Price (dollars)</Label>
              <Input id="plan-amount" inputMode="decimal" value={newPlan.amount} onChange={(e) => setNewPlan({ ...newPlan, amount: e.target.value })} data-testid="plan-amount" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="plan-currency">Currency</Label>
              <NativeSelect id="plan-currency" value="usd" disabled onChange={() => undefined} data-testid="plan-currency">
                <option value="usd">US dollars</option>
              </NativeSelect>
            </div>
            <div className="flex items-end">
              <Button disabled={busy} onClick={createPlan} data-testid="plan-new">
                Create plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="coupons-heading" className="flex flex-col gap-3">
        <h2 id="coupons-heading" className="font-heading text-xl font-bold">
          Coupons
        </h2>
        {coupons.length === 0 && <p data-testid="coupons-empty">No coupons yet.</p>}
        <ul className="flex flex-col gap-3">
          {coupons.map((c, i) => (
            <li key={c.id}>
              <Card size="sm">
                <CardHeader>
                  <CardTitle data-testid={`coupon-code-${i}`}>{c.code}</CardTitle>
                  <CardDescription>
                    {c.percentOff !== null ? `${c.percentOff}% off` : `${formatMinor(c.amountOffMinor ?? 0, c.currency ?? "usd")} off`} &middot; used {c.redemptions}
                    {c.maxRedemptions !== null ? ` of ${c.maxRedemptions}` : ""} &middot; {c.expiresAt ? `expires ${new Date(c.expiresAt).toLocaleString()}` : "no expiry"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Checkbox id={`coupon-active-${c.id}`} checked={c.active} disabled={busy} onCheckedChange={(checked) => void act(() => client.updateCoupon(c.id, { active: checked === true }), checked === true ? "Coupon turned on." : "Coupon turned off.")} data-testid={`coupon-active-${i}`} />
                  <Label htmlFor={`coupon-active-${c.id}`}>Active</Label>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
        <Card>
          <CardHeader>
            <CardTitle>New coupon</CardTitle>
            <CardDescription>A percentage off, or a fixed amount off. One use per account.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="coupon-code">Code</Label>
              <Input id="coupon-code" value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })} data-testid="coupon-code" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="coupon-kind">Discount type</Label>
              <NativeSelect id="coupon-kind" value={newCoupon.kind} onChange={(e) => setNewCoupon({ ...newCoupon, kind: e.target.value as "percent" | "amount" })} data-testid="coupon-kind">
                <option value="percent">Percentage off</option>
                <option value="amount">Dollars off</option>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="coupon-value">{newCoupon.kind === "percent" ? "Percent (1 to 100)" : "Dollars off"}</Label>
              <Input id="coupon-value" inputMode="decimal" value={newCoupon.value} onChange={(e) => setNewCoupon({ ...newCoupon, value: e.target.value })} data-testid={newCoupon.kind === "percent" ? "coupon-percent" : "coupon-amount"} />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="coupon-expires">Expires (optional)</Label>
              <Input id="coupon-expires" type="datetime-local" value={newCoupon.expires} onChange={(e) => setNewCoupon({ ...newCoupon, expires: e.target.value })} data-testid="coupon-expires" />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="coupon-limit">Most uses in total (optional)</Label>
              <Input id="coupon-limit" inputMode="numeric" value={newCoupon.limit} onChange={(e) => setNewCoupon({ ...newCoupon, limit: e.target.value })} data-testid="coupon-limit" />
            </div>
            <div className="flex items-end">
              <Button disabled={busy} onClick={createCoupon} data-testid="coupon-new">
                Create coupon
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="audit-heading" className="flex flex-col gap-3">
        <h2 id="audit-heading" className="font-heading text-xl font-bold">
          Change history
        </h2>
        {audit.length === 0 && <p data-testid="billing-audit-empty">No changes yet.</p>}
        <ul className="flex flex-col gap-2" data-testid="billing-audit-list">
          {audit.map((a) => (
            <li key={a.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{a.action.replace("billing.", "").replace(".", " ")}</p>
              <p className="text-muted-foreground">
                {new Date(a.at).toLocaleString()} &middot; {a.subject} &middot; by {a.actorId}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
