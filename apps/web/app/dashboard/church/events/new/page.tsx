import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EventEditor } from "@/components/church/event-editor";
import { draftFromEvent, emptyDraft } from "@/lib/church/event-draft";
import { MOCK_CHURCH_NAME, findManagedEvent } from "@/lib/church/mock-data";

export const metadata: Metadata = {
  title: "Create Event | Signal One Sound",
};

export default async function NewEventPage({
  searchParams,
}: PageProps<"/dashboard/church/events/new">) {
  // ?replace=<id> starts a new event from an existing one's details.
  const replace = (await searchParams).replace;
  const source = typeof replace === "string" ? findManagedEvent(replace) : undefined;

  return (
    <>
      <Link
        href="/dashboard/church"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" /> Back to dashboard
      </Link>
      <EventEditor
        mode={source ? "replace" : "create"}
        initial={source ? draftFromEvent(source) : emptyDraft(MOCK_CHURCH_NAME)}
        returnHref="/dashboard/church"
        returnLabel="Back to dashboard"
      />
    </>
  );
}
