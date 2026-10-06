import type { ReactNode } from "react";
import { AppHeader } from "@/components/shell/app-header";

/**
 * Global application frame used by the root layout. Pages render only their own
 * content inside it. To try another navigation pattern (sidebar, bottom tabs),
 * change this component; feature pages stay untouched.
 */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
