import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { ContactForm } from "@/components/marketing/contact-form";
import { getContactService } from "@/lib/composition";

export const metadata: Metadata = { title: "Contact | Signal One Sound" };

// Read on every request: the form appears only when CONTACT_FORM_ENABLED is on (it collects personal
// information, so production keeps it off until the legal gates are met). The address always shows.
export const dynamic = "force-dynamic";

function formIsOpen(): boolean {
  try {
    return getContactService().isOpen();
  } catch {
    return false;
  }
}

export default function ContactPage() {
  const open = formIsOpen();
  return (
    <LegalPage title="Contact">
      <p>For questions, to report a listing, or to make a privacy request (download or delete your information), write to us.</p>
      <p>
        <a href="mailto:contact@signalonesound.com" data-testid="contact-email" className="font-medium underline underline-offset-4">
          contact@signalonesound.com
        </a>
      </p>
      {open && (
        <>
          <h2>Or send a message</h2>
          <ContactForm />
        </>
      )}
    </LegalPage>
  );
}
