import type { Metadata } from "next";

import { InviteLink } from "@/components/events/invite-link";

export const metadata: Metadata = { title: "Invite a friend | Signal One Sound" };

// Protected by proxy.ts (everything under /account).
export default function InvitePage() {
  return (
    <>
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Invite a friend</h1>
      <InviteLink />
    </>
  );
}
