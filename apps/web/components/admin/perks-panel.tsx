"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createApiClient, createBillingClient, type AccountType, type Perk, type Plan } from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

type Outcome = { ok: boolean; error?: { message: string; fieldErrors?: Record<string, string[]> } };

const TYPE_LABEL: Record<AccountType, string> = { member: "Members", organization: "Churches and ministries" };

// Perks (S20): the admin decides what each plan includes. A perk is a named benefit; ticking it on a plan gives it
// to everyone on that plan. Nothing in the product asks for a perk yet, so changes here only take effect once a
// feature is built to ask for one. The server derives who has what; this screen only edits the lists.
export function PerksPanel({ plans, onChanged }: { plans: Plan[]; onChanged: () => void }) {
  const client = useMemo(() => createBillingClient(createApiClient({ baseUrl: "" })).admin, []);
  const [perks, setPerks] = useState<Perk[]>([]);
  const [ticks, setTicks] = useState<Record<string, string[]>>({});
  const [draft, setDraft] = useState({ key: "", label: "", description: "", accountType: "member" as AccountType });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [p, t] = await Promise.all([client.listPerks(), client.listPlanPerks()]);
    if (p.ok) setPerks(p.data.items);
    if (t.ok) setTicks(Object.fromEntries(t.data.items.map((item) => [item.planId, item.perkIds])));
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
      onChanged();
    } else {
      const fields = result.error?.fieldErrors;
      setError((fields && Object.values(fields)[0]?.[0]) ?? result.error?.message ?? "Something went wrong");
    }
    setBusy(false);
  }

  function createPerk() {
    void act(() => client.createPerk({ key: draft.key.trim(), label: draft.label, description: draft.description, accountType: draft.accountType }), "Perk added. Tick it on the plans that should include it.").then(() => setDraft((d) => ({ ...d, key: "", label: "", description: "" })));
  }

  function toggle(planId: string, perkId: string, on: boolean) {
    const current = ticks[planId] ?? [];
    setTicks({ ...ticks, [planId]: on ? [...current, perkId] : current.filter((id) => id !== perkId) });
  }

  return (
    <section aria-labelledby="perks-heading" className="flex flex-col gap-3">
      <h2 id="perks-heading" className="font-heading text-xl font-bold">
        Perks: what each plan includes
      </h2>
      <p className="text-sm text-muted-foreground">
        A perk is a benefit, such as &ldquo;No ads&rdquo;. Add perks, then tick the ones each plan includes. You can change this any time. While payment is not required, everyone has every perk that is switched on.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="perks-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground" data-testid="perks-notice">
          {notice}
        </p>
      )}

      {perks.length === 0 && <p data-testid="perks-empty">No perks yet.</p>}
      <ul className="flex flex-col gap-2">
        {perks.map((perk) => (
          <li key={perk.id}>
            <Card size="sm">
              <CardHeader>
                <CardTitle data-testid={`perk-label-${perk.key}`}>{perk.label}</CardTitle>
                <CardDescription>
                  {TYPE_LABEL[perk.accountType]} &middot; key: {perk.key}
                  {perk.description ? ` · ${perk.description}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-2">
                <Checkbox id={`perk-active-${perk.id}`} checked={perk.active} disabled={busy} onCheckedChange={(checked) => void act(() => client.updatePerk(perk.id, { active: checked === true }), checked === true ? "Perk switched on." : "Perk switched off.")} data-testid={`perk-active-${perk.key}`} />
                <Label htmlFor={`perk-active-${perk.id}`}>Switched on</Label>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <Card>
        <CardHeader>
          <CardTitle>New perk</CardTitle>
          <CardDescription>The key is a short code (lowercase letters, numbers, underscores) that the software uses. It cannot be changed later.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <Label htmlFor="perk-label">Name people see</Label>
            <Input id="perk-label" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} data-testid="perk-label" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="perk-key">Key</Label>
            <Input id="perk-key" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} data-testid="perk-key" />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="perk-type">Who it is for</Label>
            <NativeSelect id="perk-type" value={draft.accountType} onChange={(e) => setDraft({ ...draft, accountType: e.target.value as AccountType })} data-testid="perk-type">
              <option value="member">{TYPE_LABEL.member}</option>
              <option value="organization">{TYPE_LABEL.organization}</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="perk-description">Short description (optional)</Label>
            <Input id="perk-description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} data-testid="perk-description" />
          </div>
          <div className="sm:col-span-2">
            <Button disabled={busy} onClick={createPerk} data-testid="perk-create">
              Add perk
            </Button>
          </div>
        </CardContent>
      </Card>

      <h3 className="font-heading text-lg font-bold">What each plan includes</h3>
      {plans.length === 0 && <p>Create a plan first.</p>}
      <ul className="flex flex-col gap-2">
        {plans.map((plan) => {
          const options = perks.filter((perk) => perk.accountType === plan.accountType);
          const chosen = ticks[plan.id] ?? [];
          return (
            <li key={plan.id}>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{TYPE_LABEL[plan.accountType]}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2">
                  {options.length === 0 && <p className="text-sm text-muted-foreground">No perks for this kind of plan yet.</p>}
                  {options.map((perk) => (
                    <div key={perk.id} className="flex items-center gap-2">
                      <Checkbox id={`plan-perk-${plan.id}-${perk.key}`} checked={chosen.includes(perk.id)} disabled={busy} onCheckedChange={(checked) => toggle(plan.id, perk.id, checked === true)} data-testid={`plan-perk-${plan.id}-${perk.key}`} />
                      <Label htmlFor={`plan-perk-${plan.id}-${perk.key}`}>
                        {perk.label}
                        {perk.active ? "" : " (switched off)"}
                      </Label>
                    </div>
                  ))}
                  <div>
                    <Button variant="outline" size="sm" disabled={busy || options.length === 0} onClick={() => void act(() => client.setPlanPerks(plan.id, { perkIds: chosen }), "Plan perks saved.")} data-testid={`plan-perks-save-${plan.id}`}>
                      Save what this plan includes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
