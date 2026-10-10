import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage } from "@/components/legal/legal-page";
import { PlanChooseButton } from "@/components/marketing/plan-choose-button";
import { getServerEnv } from "@/lib/env/server";
import { getBillingService } from "@/lib/composition";
import { formatMinor } from "@/lib/billing/money";
import { SERVICES } from "@/lib/marketing/content";

export const metadata: Metadata = { title: "Services | Signal One Sound", description: "What Signal One Sound offers people looking for revival gatherings and the churches and ministries that host them." };

// Read on every request, because the plans an admin switches on change what this page shows.
export const dynamic = "force-dynamic";

type PublicPlan = { id: string; name: string; accountType: string; price: { amountMinor: number; currency: string; interval: string } | null };

/** The plans an admin has switched on. Only active plans with a price ever appear; on any failure the page says "free during early access". */
async function activePlans(): Promise<PublicPlan[]> {
  try {
    return (await getBillingService().listPublicPlans()).items;
  } catch {
    return [];
  }
}

function List({ items, testId }: { items: readonly string[]; testId: string }) {
  return (
    <ul className="list-disc pl-6 text-sm leading-relaxed" data-testid={testId}>
      {items.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

/** Checkout buttons show only when payments are switched on (PAYMENTS_PROVIDER=stripe). */
function checkoutOpen(): boolean {
  try {
    return getServerEnv().paymentsProvider === "stripe";
  } catch {
    return false;
  }
}

export default async function ServicesPage() {
  const plans = await activePlans();
  const canBuy = checkoutOpen();
  return (
    <LegalPage title="Services">
      <p>Signal One Sound helps people find revival gatherings and helps churches and ministries be found. Here is what is included, and what is coming.</p>

      <h2>For people looking</h2>
      <h3 className="font-semibold">Free today</h3>
      <List items={SERVICES.members.free} testId="services-members-free" />
      <h3 className="font-semibold">Coming</h3>
      <List items={SERVICES.members.coming} testId="services-members-coming" />

      <h2>For churches and ministries</h2>
      <h3 className="font-semibold">Free today</h3>
      <List items={SERVICES.churches.free} testId="services-churches-free" />
      <h3 className="font-semibold">Coming</h3>
      <List items={SERVICES.churches.coming} testId="services-churches-coming" />

      <h2>Pricing</h2>
      {plans.length === 0 ? (
        <p data-testid="services-pricing-free">Free during early access. If we add paid options, we will show the prices here and tell you before anything is charged.</p>
      ) : (
        <ul className="flex flex-col gap-2" data-testid="services-pricing-list">
          {plans.map((plan, i) => (
            <li key={plan.id} className="rounded-lg border p-3">
              <p className="font-medium">{plan.name}</p>
              <p className="text-sm text-muted-foreground">{plan.price ? `${formatMinor(plan.price.amountMinor, plan.price.currency)} per ${plan.price.interval}` : ""}</p>
              {canBuy && plan.accountType === "member" && <PlanChooseButton planId={plan.id} index={i} />}
            </li>
          ))}
        </ul>
      )}

      <p>
        Questions? See the <Link href="/faq" className="underline underline-offset-4" data-testid="services-faq-link">frequently asked questions</Link> or{" "}
        <Link href="/contact" className="underline underline-offset-4" data-testid="services-contact-link">contact us</Link>.
      </p>
    </LegalPage>
  );
}
