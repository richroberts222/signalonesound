import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Contact | Signal One Sound" };

// The contact address is an owner decision (docs/features/s1-identity-and-policy.md) and must be
// set before real users arrive. Until then this page says so plainly instead of inventing one.
export default function ContactPage() {
  return (
    <LegalPage title="Contact">
      <p>
        For questions, to report a listing, or to make a privacy request (download or delete your information), use the
        contact details published here.
      </p>
      <p data-testid="contact-pending">Contact details will be published here before the service opens to the public.</p>
    </LegalPage>
  );
}
