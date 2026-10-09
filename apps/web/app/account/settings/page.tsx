import type { Metadata } from "next";

import { AccountSettings } from "@/components/member/account-settings";

export const metadata: Metadata = { title: "Account settings | Signal One Sound" };

// Protected by proxy.ts (everything under /account). The API re-authenticates every request.
export default function AccountSettingsPage() {
  return (
    <>
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Account settings</h1>
      <AccountSettings />
    </>
  );
}
