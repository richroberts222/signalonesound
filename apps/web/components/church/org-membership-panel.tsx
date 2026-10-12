"use client";

import { useEffect, useMemo, useState } from "react";
import { createApiClient, createBillingClient, type Entitlement, type Plan } from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canChoosePlan, canManageBilling, membershipStatusText } from "@/lib/billing/membership-text";
import { formatMinor } from "@/lib/billing/money";

// A church's plan page (S14): the plan in words, the church plans that can be chosen, and the provider's page to change a
// card or cancel. It shows only what the server says; it never decides who is entitled, and the price is never sent from here.
export function OrgMembershipPanel({ orgId }: { orgId: string }) {
  const api = useMemo(() => createBillingClient(createApiClient({ baseUrl: "" })), []);
  const client = useMemo(() => api.organization(orgId), [api, orgId]);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [e, p] = await Promise.all([client.getEntitlement(), api.getPublicPlans()]);
      if (!e.ok) return setError(e.error.code === "not_found" ? "This page is only for the managers of this church or ministry." : "We could not load the membership. Please try again.");
      setEntitlement(e.data);
      if (p.ok) setPlans(p.data.items.filter((plan) => plan.accountType === "organization"));
    })();
  }, [api, client]);

  async function go(key: string, run: () => ReturnType<typeof client.startCheckout>) {
    setBusy(key);
    setError(null);
    const result = await run();
    if (result.ok) return window.location.assign(result.data.url);
    setError(result.error.code === "conflict" ? result.error.message : result.error.code === "policy_reacceptance_required" ? "Please accept the current Terms and Privacy Policy first." : "We could not open the payment page. Please try again, or contact us.");
    setBusy(null);
  }

  if (!entitlement) {
    return error ? (
      <p role="alert" className="text-destructive" data-testid="org-membership-error">
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
          <CardTitle>This church or ministry</CardTitle>
          <CardDescription data-testid="org-membership-status">{membershipStatusText(entitlement)}</CardDescription>
        </CardHeader>
        {canManageBilling(entitlement) && (
          <CardContent>
            <Button variant="outline" disabled={busy !== null} onClick={() => void go("manage", () => client.openBillingPortal())} data-testid="org-membership-manage">
              Manage billing
            </Button>
          </CardContent>
        )}
      </Card>

      {canChoosePlan(entitlement) && (
        <section aria-labelledby="org-membership-plans" className="flex flex-col gap-2">
          <h2 id="org-membership-plans" className="font-heading text-xl font-bold">
            Choose a plan
          </h2>
          {plans.length === 0 && <p className="text-muted-foreground">No plans are open yet. Please check back soon.</p>}
          <ul className="grid gap-3 sm:grid-cols-2">
            {plans.map((plan, i) => (
              <li key={plan.id} className="rounded-xl border p-4" data-testid={`org-membership-plan-${i}`}>
                <p className="font-medium">{plan.name}</p>
                {plan.price && <p className="text-sm text-muted-foreground">{`${formatMinor(plan.price.amountMinor, plan.price.currency)} per ${plan.price.interval}`}</p>}
                <Button size="sm" className="mt-2" disabled={busy !== null} onClick={() => void go(plan.id, () => client.startCheckout(plan.id))} data-testid={`org-plan-choose-${i}`}>
                  {busy === plan.id ? "Opening checkout..." : "Choose this plan"}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="org-membership-error">
          {error}
        </p>
      )}
    </div>
  );
}
