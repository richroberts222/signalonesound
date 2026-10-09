import type { Metadata } from "next";
import { Suspense } from "react";

import { ClaimChurchForm } from "@/components/church/claim-church-form";

export const metadata: Metadata = { title: "Claim your church or ministry | Signal One Sound" };

// Protected by proxy.ts; the API re-authenticates every request and decides what the member may do.
export default function ClaimChurchPage() {
  return (
    <main className="flex flex-1 items-start justify-center p-4 sm:p-8">
      <Suspense>
        <ClaimChurchForm />
      </Suspense>
    </main>
  );
}
