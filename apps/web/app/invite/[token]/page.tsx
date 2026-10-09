import type { Metadata } from "next";

import { InviteArrival } from "@/components/events/invite-arrival";

export const metadata: Metadata = {
  title: "You are invited | Signal One Sound",
  description: "Find revival gatherings and churches near you.",
  // An invite link is private to whoever it was sent to: keep it out of search engines.
  robots: { index: false, follow: false },
};

// Public: a friend who followed an invite link. No sign-in needed.
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="flex flex-1 items-start justify-center p-4 sm:p-8">
      <InviteArrival token={token} />
    </main>
  );
}
