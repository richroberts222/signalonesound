import type { Metadata } from "next";

import { BillingConsole } from "@/components/admin/billing-console";

export const metadata: Metadata = { title: "Billing | Signal One Sound" };

// Protected by proxy.ts (everything under /admin) for sign-in; the API answers "not found" to anyone who
// is not a platform admin, so the page shows nothing to them.
export default function BillingPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-8">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Billing</h1>
      <BillingConsole />
    </main>
  );
}
