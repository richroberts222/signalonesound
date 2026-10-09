import type { ReactNode } from "react";
import { AppHeader } from "@/components/shell/app-header";
import { PolicyGate } from "@/components/shell/policy-gate";
import { SiteFooter } from "@/components/shell/site-footer";

/**
 * Global application frame used by the root layout. Pages render only their own
 * content inside it. To try another navigation pattern (sidebar, bottom tabs),
 * change this component; feature pages stay untouched.
 *
 * Reference-application additions (removed from a generated application, which starts from
 * scripts/boilerplate/templates/app-shell.tsx): the policy gate sends a signed-in member who has not
 * accepted the current Terms and Privacy Policy to the acceptance step (S1), and the footer links
 * the public pages.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      <PolicyGate />
      {children}
      <SiteFooter />
    </>
  );
}
