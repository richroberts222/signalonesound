import type { Metadata } from "next";

import { MembershipPanel } from "@/components/member/membership-panel";

export const metadata: Metadata = { title: "My membership | Signal One Sound" };

// Protected by proxy.ts (everything under /account). The API re-authenticates every request.
export default function MembershipPage() {
  return (
    <>
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">My membership</h1>
      <MembershipPanel />
    </>
  );
}
