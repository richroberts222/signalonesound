import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "About | Signal One Sound" };

export default function AboutPage() {
  return (
    <LegalPage title="About Signal One Sound">
      <p>
        Signal One Sound connects believers with churches, ministries and revival gatherings, and strengthens local
        churches by making their events easy to find.
      </p>
      <p>
        Search by place, distance, date and kind of gathering, save the events that matter to you, and be told when one
        is coming near you. Churches and ministries can list their events for free.
      </p>
      <p>
        &ldquo;A voice of one who cries: Prepare in the wilderness the way of the Lord.&rdquo; Isaiah 40:3
      </p>
    </LegalPage>
  );
}
