import type { Metadata } from "next";

import { OrgMembershipPanel } from "@/components/church/org-membership-panel";

export const metadata: Metadata = { title: "Church membership | Signal One Sound" };

// A church's plan (S14). Protected by proxy.ts for sign-in; the API decides whether the person manages this organization.
export default async function ChurchMembershipPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 sm:p-8">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">Church membership</h1>
      <OrgMembershipPanel orgId={orgId} />
    </main>
  );
}
