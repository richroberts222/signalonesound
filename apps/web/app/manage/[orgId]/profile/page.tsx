import type { Metadata } from "next";

import { ChurchProfileEditor } from "@/components/churches/church-profile-editor";

export const metadata: Metadata = { title: "Church profile | Signal One Sound" };

// A church's address and regular weekly services (S18). Protected by proxy.ts for sign-in; the API decides whether
// the person manages this organization.
export default async function ChurchProfilePage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  return (
    <main className="flex flex-1 flex-col items-center gap-4 p-4 sm:p-8">
      <ChurchProfileEditor orgId={orgId} />
    </main>
  );
}
