import type { Metadata } from "next";

import { UnsubscribeConfirm } from "@/components/events/unsubscribe-confirm";

export const metadata: Metadata = {
  title: "Unsubscribe | Signal One Sound",
  robots: { index: false, follow: false },
};

// Public: the signed link is the proof, so no sign-in is needed. Opening it changes nothing; the button does.
export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <main className="flex flex-1 items-start justify-center p-4 sm:p-8">
      <UnsubscribeConfirm token={token} />
    </main>
  );
}
