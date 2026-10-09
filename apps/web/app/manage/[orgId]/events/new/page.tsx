import type { Metadata } from "next";

import { EventEditor } from "@/components/events/event-editor";

export const metadata: Metadata = { title: "New event | Signal One Sound" };

export default async function NewEventPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  return (
    <main className="flex flex-1 items-start justify-center p-4 sm:p-8">
      <EventEditor orgId={orgId} />
    </main>
  );
}
