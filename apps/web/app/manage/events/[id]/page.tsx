import type { Metadata } from "next";

import { EditEvent } from "@/components/events/edit-event";

export const metadata: Metadata = { title: "Edit event | Signal One Sound" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <main className="flex flex-1 items-start justify-center p-4 sm:p-8">
      <EditEvent id={id} />
    </main>
  );
}
