import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { RevivalTypeBadge } from "@/components/discover/revival-type-badge";
import { SaveButton } from "@/components/discover/save-button";
import {
  formatCityState,
  formatDateSpan,
  formatMiles,
  formatTimeSpan,
} from "@/lib/discover/format";
import type { MockEvent } from "@/lib/discover/types";
import { cn } from "@/lib/utils";

type EventCardProps = {
  event: MockEvent;
  distanceMiles: number | null;
  /** Query string carried to Event Details so Back restores the search. */
  query: string;
  selected?: boolean;
  onHover?: (eventId: string | null) => void;
};

/** One Event in a result list. The title link covers the card; Save sits above it. */
export function EventCard({ event, distanceMiles, query, selected, onHover }: EventCardProps) {
  const href = `/discover/${event.id}${query ? `?${query}` : ""}`;

  return (
    <article
      onMouseEnter={() => onHover?.(event.id)}
      onMouseLeave={() => onHover?.(null)}
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-xs transition-colors hover:border-primary/50 focus-within:border-primary/50",
        selected && "border-primary ring-2 ring-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-heading text-lg leading-snug font-semibold">
            <Link href={href} className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-3 focus-visible:after:ring-ring/50">
              {event.title}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground">{event.organization.name}</p>
        </div>
        <SaveButton eventId={event.id} eventTitle={event.title} className="relative z-10 shrink-0" />
      </div>

      <ul className="flex flex-wrap gap-1.5" aria-label="Revival Types">
        {event.revivalTypes.map((t) => (
          <li key={t}>
            <RevivalTypeBadge type={t} />
          </li>
        ))}
      </ul>

      <dl className="grid gap-1.5 text-sm">
        <div className="flex items-center gap-2">
          <dt className="sr-only">Date</dt>
          <CalendarDays aria-hidden className="size-4 text-primary" />
          <dd>{formatDateSpan(event)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Time</dt>
          <Clock aria-hidden className="size-4 text-primary" />
          <dd>{formatTimeSpan(event)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Location</dt>
          <MapPin aria-hidden className="size-4 text-primary" />
          <dd>
            {event.venue.name}, {formatCityState(event.venue)}
            {distanceMiles !== null ? (
              <span className="text-muted-foreground"> · {formatMiles(distanceMiles)} away</span>
            ) : null}
          </dd>
        </div>
      </dl>
    </article>
  );
}
