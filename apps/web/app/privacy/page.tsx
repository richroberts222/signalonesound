import type { Metadata } from "next";
import { CURRENT_POLICY_VERSION } from "@signalone/validation";

import { LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Privacy Policy | Signal One Sound" };

// Plain-language draft written from what the platform actually stores (docs/data-inventory.md).
// It has not been reviewed by an attorney; that review is a launch task (docs/risk-and-legal.md).
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={CURRENT_POLICY_VERSION}>
      <p>
        We collect as little as we can. Your faith is personal, so what you look at and save here is treated as sensitive
        information.
      </p>
      <h2>Browsing needs no account</h2>
      <p>
        You can search and read about events without signing in. We do not keep a record of who you are or what you
        search for. We count visits in total, without identifying anyone.
      </p>
      <h2>What we keep when you have an account</h2>
      <ul>
        <li>Your sign-in details are held by our sign-in provider, Clerk. We do not copy your email address into our own records.</li>
        <li>The name you choose to show, whether you want email, and your time zone.</li>
        <li>Which version of these policies you accepted, and when.</li>
        <li>Events you save and alerts you set, as you use those features. Places you give us are kept only approximately.</li>
      </ul>
      <h2>What we do not do</h2>
      <ul>
        <li>We do not sell your information or use it for advertising.</li>
        <li>We do not record your screen or track your taps.</li>
        <li>We do not store payment card numbers, government identification numbers or medical records.</li>
      </ul>
      <h2>Your choices</h2>
      <ul>
        <li>You can download everything we hold about you from your account page.</li>
        <li>You can delete your account from your account page. Your information is removed. A record that you accepted these policies is kept without your name.</li>
      </ul>
      <h2>Who it is shared with</h2>
      <p>
        Only the services that run the platform (hosting, sign-in and the database). They may use it only to provide
        their service to us. We may share information when the law requires it.
      </p>
      <h2>Adults only</h2>
      <p>Signal One Sound is for people 18 and older. We do not knowingly collect information from children.</p>
      <h2>Changes</h2>
      <p>If this policy changes in a way that matters, we will ask you to accept the new version.</p>
      <p>
        Questions or requests about your information: see the <a href="/contact" className="underline" data-testid="privacy-contact-link">contact page</a>.
      </p>
    </LegalPage>
  );
}
