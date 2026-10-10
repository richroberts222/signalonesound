import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Contact | Signal One Sound" };

// The contact address is an owner decision (docs/features/s1-identity-and-policy.md). It forwards to the
// owner's inbox through the domain's email forwarding.
export default function ContactPage() {
  return (
    <LegalPage title="Contact">
      <p>For questions, to report a listing, or to make a privacy request (download or delete your information), write to us.</p>
      <p>
        <a href="mailto:contact@signalonesound.com" data-testid="contact-email" className="font-medium underline underline-offset-4">
          contact@signalonesound.com
        </a>
      </p>
    </LegalPage>
  );
}
