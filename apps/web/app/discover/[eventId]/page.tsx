import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, ExternalLink, MapPin } from "lucide-react";
import { EventActions } from "@/components/discover/event-actions";
import { MockBanner } from "@/components/discover/mock-banner";
import { RevivalTypeBadge } from "@/components/discover/revival-type-badge";
import { filtersToQuery, parseFilters } from "@/lib/discover/filters";
import { formatAddress, formatDateSpan, formatTimeSpan } from "@/lib/discover/format";
import { MOCK_EVENTS, findMockEvent } from "@/lib/discover/mock-data";

export function generateStaticParams() {
  return MOCK_EVENTS.map((e) => ({ eventId: e.id }));
}

export async function generateMetadata({ params }: PageProps<"/discover/[eventId]">): Promise<Metadata> {
  const event = findMockEvent((await params).eventId);
  return { title: event ? `${event.title} | Signal One Sound` : "Event | Signal One Sound" };
}

export default async function EventDetailsPage({
  params,
  searchParams,
}: PageProps<"/discover/[eventId]">) {
  const event = findMockEvent((await params).eventId);
  if (!event) notFound();

  // Rebuild the search query from validated filters so Back restores the search.
  const raw = await searchParams;
  const incoming = new URLSearchParams(
    Object.entries(raw).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  );
  const query = filtersToQuery(parseFilters(incoming));
  const backHref = query ? `/discover?${query}` : "/discover";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href={backHref}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" /> Back to results
      </Link>

      <MockBanner />

      <header className="flex flex-col gap-3">
        <ul className="flex flex-wrap gap-1.5" aria-label="Revival Types">
          {event.revivalTypes.map((t) => (
            <li key={t}>
              <RevivalTypeBadge type={t} />
            </li>
          ))}
        </ul>
        <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          {event.title}
        </h1>
        <p className="text-lg text-muted-foreground">{event.summary}</p>
      </header>

      <EventActions event={event} />

      <section className="grid gap-4 rounded-2xl border bg-card p-4 text-card-foreground sm:grid-cols-2 sm:p-5">
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-semibold">When</h2>
          <p className="flex items-center gap-2">
            <CalendarDays aria-hidden className="size-4 text-primary" /> {formatDateSpan(event)}
          </p>
          <p className="flex items-center gap-2">
            <Clock aria-hidden className="size-4 text-primary" /> {formatTimeSpan(event)}
            {event.endDate ? <span className="text-sm text-muted-foreground">each day</span> : null}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-semibold">Where</h2>
          <p className="flex items-start gap-2">
            <MapPin aria-hidden className="mt-1 size-4 shrink-0 text-primary" />
            <span>
              <span className="font-medium">{event.venue.name}</span>
              <br />
              <span className="text-muted-foreground">{formatAddress(event.venue)}</span>
            </span>
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-semibold">About this gathering</h2>
        <p className="leading-relaxed">{event.description}</p>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-4 text-card-foreground sm:p-5">
        <h2 className="font-heading text-lg font-semibold">Hosted by</h2>
        <p className="font-medium">{event.organization.name}</p>
        <ul className="flex flex-wrap gap-2">
          {event.organization.links.map((l) => (
            <li key={l.url}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm hover:bg-muted"
              >
                {l.label} <ExternalLink aria-hidden className="size-3" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      {event.speakers?.length ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-semibold">Speakers</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {event.speakers.map((s) => (
              <li key={s.name} className="rounded-xl border bg-card px-4 py-3 text-card-foreground">
                <p className="font-medium">{s.name}</p>
                {s.role ? <p className="text-sm text-muted-foreground">{s.role}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
