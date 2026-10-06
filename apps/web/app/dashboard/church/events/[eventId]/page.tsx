import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Repeat } from "lucide-react";
import { ChurchMockNotice } from "@/components/church/mock-notice";
import { ManageActions } from "@/components/church/manage-actions";
import { ManagedEventCard } from "@/components/church/managed-event-card";
import { formatDay } from "@/lib/discover/format";
import { findManagedEvent } from "@/lib/church/mock-data";

export const metadata: Metadata = {
  title: "Manage Event | Signal One Sound",
};

export default async function ManageEventPage({
  params,
}: PageProps<"/dashboard/church/events/[eventId]">) {
  const event = findManagedEvent((await params).eventId);
  if (!event) notFound();

  return (
    <>
      <Link
        href="/dashboard/church"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" /> Back to dashboard
      </Link>

      <ChurchMockNotice />

      <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
        Manage event
      </h1>

      <ManagedEventCard event={event} showManageLink={false} />

      {event.recurrence ? (
        <section aria-labelledby="series-heading" className="flex flex-col gap-2 rounded-xl border p-4">
          <h2 id="series-heading" className="font-heading flex items-center gap-2 text-base font-semibold">
            <Repeat aria-hidden className="size-4 text-primary" /> Recurring: {event.recurrence.pattern}
          </h2>
          <p className="text-sm text-muted-foreground">
            Upcoming occurrences (illustrative):
          </p>
          <ul className="flex flex-wrap gap-2 text-sm">
            {event.recurrence.upcoming.map((d) => (
              <li key={d} className="rounded-full border px-3 py-1">
                {formatDay(d)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ManageActions eventId={event.id} recurring={Boolean(event.recurrence)} />
    </>
  );
}
