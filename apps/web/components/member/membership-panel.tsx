"use client";

import { useEffect, useMemo, useState } from "react";
import { createApiClient, createBillingClient, type Entitlement, type Plan } from "@signalone/validation";

import { PlanChooseButton } from "@/components/marketing/plan-choose-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canChoosePlan, canManageBilling, membershipStatusText } from "@/lib/billing/membership-text";
import { formatMinor } from "@/lib/billing/money";

// The member's Membership page (S13): the membership in words, the plans they can choose, and the provider's page to
// change a card or cancel. It shows only what the server says (the entitlement and the active plans); it never decides
// who is entitled, and the price is never sent from here.
export function MembershipPanel() {
  const client = useMemo(() => createBillingClient(createApiClient({ baseUrl: "" })), []);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const [e, p] = await Promise.all([client.getEntitlements(), client.getPublicPlans()]);
      if (!e.ok) return setError("We could not load your membership. Please try again.");
      setEntitlement(e.data.items.find((i) => i.accountType === "member") ?? null);
      if (p.ok) setPlans(p.data.items.filter((plan) => plan.accountType === "member"));
    })();
  }, [client]);

  async function manage() {
    setBusy(true);
    setError(null);
    const result = await client.openBillingPortal();
    if (result.ok) return window.location.assign(result.data.url);
    setError("We could not open the billing page. Please try again, or contact us.");
    setBusy(false);
  }

  if (!entitlement) {
    return error ? (
      <p role="alert" className="text-destructive" data-testid="membership-error">
        {error}
      </p>
    ) : (
      <p>Loading...</p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Your membership</CardTitle>
          <CardDescription data-testid="membership-status">{membershipStatusText(entitlement)}</CardDescription>
        </CardHeader>
        {canManageBilling(entitlement) && (
          <CardContent>
            <Button variant="outline" disabled={busy} onClick={() => void manage()} data-testid="membership-manage">
              Manage billing
            </Button>
          </CardContent>
        )}
      </Card>

      {canChoosePlan(entitlement) && (
        <section aria-labelledby="membership-plans" className="flex flex-col gap-2">
          <h2 id="membership-plans" className="font-heading text-xl font-bold">
            Choose a plan
          </h2>
          {plans.length === 0 && <p className="text-muted-foreground">No plans are open yet. Please check back soon.</p>}
          <ul className="grid gap-3 sm:grid-cols-2">
            {plans.map((plan, i) => (
              <li key={plan.id} className="rounded-xl border p-4" data-testid={`membership-plan-${i}`}>
                <p className="font-medium">{plan.name}</p>
                {plan.price && <p className="text-sm text-muted-foreground">{`${formatMinor(plan.price.amountMinor, plan.price.currency)} per ${plan.price.interval}`}</p>}
                <PlanChooseButton planId={plan.id} index={i} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="membership-error">
          {error}
        </p>
      )}
    </div>
  );
}
