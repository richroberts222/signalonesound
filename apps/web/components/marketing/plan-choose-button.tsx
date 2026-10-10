"use client";

import { useMemo, useState } from "react";
import { createApiClient, createBillingClient } from "@signalone/validation";

import { Button } from "@/components/ui/button";

// "Choose plan" on the Services page (S11): it asks the server to open the payment provider's own hosted checkout;
// if the person is not signed in the server says so and they are sent to sign in and brought back. Card details are entered there, never here.
// The price is not sent from the browser: the server reads it from the plan.
export function PlanChooseButton({ planId, index }: { planId: string; index: number }) {
  const client = useMemo(() => createBillingClient(createApiClient({ baseUrl: "" })), []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose() {
    setError(null);
    setBusy(true);
    const result = await client.startCheckout(planId);
    if (result.ok) {
      window.location.assign(result.data.url);
      return;
    }
    if (result.error.code === "unauthenticated") {
      // Not signed in yet: sign in, then come back to the plans (this component knows nothing about the identity vendor).
      window.location.assign("/sign-in?redirect_url=%2Fservices");
      return;
    }
    setError(result.error.code === "conflict" ? result.error.message : result.error.code === "policy_reacceptance_required" ? "Please accept the current Terms and Privacy Policy first." : "We could not open checkout. Please try again, or contact us.");
    setBusy(false);
  }

  return (
    <div className="mt-2 flex flex-col gap-1">
      <div>
        <Button size="sm" disabled={busy} onClick={() => void choose()} data-testid={`plan-choose-${index}`}>
          {busy ? "Opening checkout..." : "Choose this plan"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="plan-choose-error">
          {error}
        </p>
      )}
    </div>
  );
}
