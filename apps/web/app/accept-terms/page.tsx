import type { Metadata } from "next";

import { AcceptTermsForm } from "@/components/legal/accept-terms-form";

export const metadata: Metadata = { title: "Accept the terms | Signal One Sound" };

// Protected by proxy.ts. A signed-in member who has not accepted the current policy lands here.
export default function AcceptTermsPage() {
  return (
    <main className="flex flex-1 items-start justify-center p-4 sm:p-8">
      <AcceptTermsForm />
    </main>
  );
}
