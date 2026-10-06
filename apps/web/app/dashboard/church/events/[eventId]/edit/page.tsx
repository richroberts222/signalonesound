import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EventEditor } from "@/components/church/event-editor";
import { draftFromEvent } from "@/lib/church/event-draft";
import { findManagedEvent } from "@/lib/church/mock-data";

export const metadata: Metadata = {
  title: "Edit Event | Signal One Sound",
};

export default async function EditEventPage({
  params,
}: PageProps<"/dashboard/church/events/[eventId]/edit">) {
  const event = findManagedEvent((await params).eventId);
  if (!event) notFound();
  const back = `/dashboard/church/events/${event.id}`;

  return (
    <>
      <Link
        href={back}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" /> Back to event
      </Link>
      <EventEditor mode="edit" initial={draftFromEvent(event)} returnHref={back} returnLabel="Back to event" />
    </>
  );
}
