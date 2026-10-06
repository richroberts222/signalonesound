import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EventStatusBadge, SourceBadge } from "@/components/admin/badges";
import { ConfirmMockAction } from "@/components/admin/confirm-mock-action";
import { MockEditForm } from "@/components/admin/mock-edit-form";
import { RevivalTypeBadge } from "@/components/discover/revival-type-badge";
import { MOCK_ADMIN_EVENTS } from "@/lib/admin/mock-data";
import { formatDay, formatTime } from "@/lib/discover/format";

export const metadata: Metadata = {
  title: "Event (admin mock) | Signal One Sound",
};

export default async function AdminEventPage({ params }: PageProps<"/admin/events/[eventId]">) {
  const { eventId } = await params;
  const event = MOCK_ADMIN_EVENTS.find((e) => e.id === eventId);
  if (!event) notFound();

  return (
    <>
      <Link
        href="/admin/events"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" /> Back to events
      </Link>

      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight">{event.title}</h1>
        <div className="flex flex-wrap gap-1.5">
          <EventStatusBadge status={event.status} />
          <SourceBadge source={event.source} />
        </div>
      </header>

      <section aria-labelledby="details-heading" className="flex flex-col gap-3 rounded-xl border p-4">
        <h2 id="details-heading" className="font-heading text-lg font-semibold">
          Details
        </h2>
        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">Organization</dt>
          <dd>
            {event.orgId ? (
              <Link href={`/admin/organizations/${event.orgId}`} className="text-primary underline-offset-4 hover:underline">
                {event.orgName}
              </Link>
            ) : (
              <>
                {event.orgName} <span className="text-muted-foreground">(no linked organization)</span>
              </>
            )}
          </dd>
          <dt className="text-muted-foreground">When</dt>
          <dd>
            {formatDay(event.date)} · {formatTime(event.startTime)}
          </dd>
          <dt className="text-muted-foreground">Where</dt>
          <dd>
            {event.venueName}, {event.city}, {event.state}
          </dd>
          <dt className="text-muted-foreground">Revival Types</dt>
          <dd>
            <ul className="flex flex-wrap gap-1.5">
              {event.revivalTypes.map((t) => (
                <li key={t}>
                  <RevivalTypeBadge type={t} />
                </li>
              ))}
            </ul>
          </dd>
          <dt className="text-muted-foreground">Source</dt>
          <dd>{event.sourceDetail}</dd>
        </dl>
        <MockEditForm
          idPrefix="event"
          subject="Event"
          fields={[
            { name: "title", label: "Title", value: event.title, required: true },
            { name: "date", label: "Date (YYYY-MM-DD)", value: event.date, required: true },
            { name: "time", label: "Start time (HH:mm)", value: event.startTime, required: true },
            { name: "venue", label: "Venue", value: event.venueName, required: true },
            { name: "city", label: "City", value: event.city, required: true },
          ]}
        />
      </section>

      <section aria-labelledby="remove-heading" className="flex flex-col gap-3 rounded-xl border border-destructive/30 p-4">
        <h2 id="remove-heading" className="font-heading text-lg font-semibold">
          Remove
        </h2>
        <p className="text-sm text-muted-foreground">
          Would take this event out of Discover. Whether removal is permanent or reversible, and how
          the source is told, is not decided.
        </p>
        <ConfirmMockAction
          label="Remove event"
          prompt={`Remove "${event.title}"?`}
          doneMessage="Mock only: nothing was removed. This event is still in the list."
        />
      </section>
    </>
  );
}
