import type { Metadata } from "next";
import { CURRENT_POLICY_VERSION } from "@signalone/validation";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Terms of Use | Signal One Sound" };

// Plain-language draft. It has not been reviewed by an attorney; that review is a launch task
// (docs/risk-and-legal.md). Changing the text in a way that matters means changing
// CURRENT_POLICY_VERSION so every member is asked to accept again.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated={CURRENT_POLICY_VERSION}>
      <p>
        Signal One Sound helps people find revival gatherings and the churches and ministries that hold them. By
        creating an account you agree to these terms.
      </p>
      <h2>Who can use it</h2>
      <ul>
        <li>You must be 18 or older. We ask you to confirm this when you join.</li>
        <li>You are responsible for keeping your sign-in details safe.</li>
        <li>The service is for people in the United States for now.</li>
      </ul>
      <h2>What you can do</h2>
      <ul>
        <li>Browse events, save the ones you care about, and set alerts for events near you.</li>
        <li>Churches and ministries may list their own events once their listing has been approved.</li>
      </ul>
      <h2>What you must not do</h2>
      <ul>
        <li>Post false, misleading, hateful or unlawful content.</li>
        <li>Include personal information about children or private people in an event listing.</li>
        <li>Try to break, overload or misuse the service, or access another person&apos;s account.</li>
      </ul>
      <h2>Listings</h2>
      <p>
        Each church or ministry is responsible for its own listings. We do not promise that any event will happen as
        described. Check with the organizer before you travel. You can report a listing, and we may remove content or
        accounts that break these terms.
      </p>
      <h2>No guarantees</h2>
      <p>
        The service is provided as it is, without promises that it will always be available or error free. To the extent
        the law allows, we are not responsible for losses that come from using it.
      </p>
      <h2>Ending your account</h2>
      <p>
        You can delete your account at any time from your account page. We may suspend or end accounts that break these
        terms.
      </p>
      <h2>Changes</h2>
      <p>
        When these terms change in a way that matters, we will ask you to accept the new version before you keep using
        member features.
      </p>
    </LegalPage>
  );
}
