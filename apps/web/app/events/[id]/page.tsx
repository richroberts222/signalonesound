import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { REVIVAL_TYPES } from "@signalone/validation";

import { EventActions } from "@/components/events/event-actions";
import { SaveButton } from "@/components/events/save-button";
import { whenText } from "@/components/events/event-card";
import { Badge } from "@/components/ui/badge";
import { getDiscoverService } from "@/lib/composition";
import { ServiceError } from "@/lib/services/errors";

// A public, shareable event page. It is rendered on the server so search engines and message
// previews can read it without running any script. An event that is not public (a draft, a deleted or
// held event, or one from an unapproved church) does not exist here.
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const load = cache(async (id: string) => {
  if (!UUID.test(id)) return null;
  try {
    return await getDiscoverService().getEvent(id);
  } catch (error) {
    if (error instanceof ServiceError && error.code === "not_found") return null;
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const event = await load((await params).id);
  if (!event) return { title: "Event not found | Signal One Sound" };
  const where = `${event.venueName}, ${event.city}, ${event.state}`;
  const description = `${whenText(event)} at ${where}. ${event.organization.name}.`;
  return {
    title: `${event.title} | Signal One Sound`,
    description,
    openGraph: { title: event.title, description, type: "website", siteName: "Signal One Sound" },
  };
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const event = await load((await params).id);
  if (!event) notFound();
  const typeLabel = (slug: string) => REVIVAL_TYPES.find((t) => t.slug === slug)?.label ?? slug;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap gap-2">
        {event.revivalTypes.map((t) => (
          <Badge key={t} variant="outline">
            {typeLabel(t)}
          </Badge>
        ))}
        {event.status === "cancelled" && <Badge variant="destructive">Cancelled</Badge>}
      </div>
      <h1 className="font-heading text-3xl font-extrabold tracking-tight">{event.title}</h1>
      <Link href={`/churches/${event.organization.id}`} className="text-primary underline-offset-4 hover:underline" data-testid="event-church-link">
        {event.organization.name}
      </Link>
      <dl className="flex flex-col gap-3 rounded-xl border border-border p-4">
        <div>
          <dt className="text-sm text-muted-foreground">When</dt>
          <dd data-testid="event-when">{whenText(event)}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Where</dt>
          <dd>
            {event.venueName}
            <br />
            {event.street}, {event.city}, {event.state} {event.zip}
          </dd>
        </div>
        {event.speakers && (
          <div>
            <dt className="text-sm text-muted-foreground">Speakers</dt>
            <dd>{event.speakers}</dd>
          </div>
        )}
        {event.directions && (
          <div>
            <dt className="text-sm text-muted-foreground">Directions</dt>
            <dd className="whitespace-pre-line">{event.directions}</dd>
          </div>
        )}
      </dl>
      {event.description && <p className="whitespace-pre-line leading-relaxed">{event.description}</p>}
      {event.links.length > 0 && (
        <ul className="flex flex-col gap-1">
          {event.links.map((link, i) => (
            <li key={link}>
              <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline" data-testid={`event-link-${i}`}>
                {link}
              </a>
            </li>
          ))}
        </ul>
      )}
      <SaveButton eventId={event.id} />
      <EventActions event={event} />
    </main>
  );
}
