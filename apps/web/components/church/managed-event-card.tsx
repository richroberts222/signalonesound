import Link from "next/link";
import { CalendarDays, Clock, MapPin, Repeat } from "lucide-react";
import { RevivalTypeBadge } from "@/components/discover/revival-type-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { formatDateSpan, formatTimeSpan } from "@/lib/discover/format";
import type { ManagedEvent } from "@/lib/church/types";
import { cn } from "@/lib/utils";

/** One Event in the Church/Ministry management list. Manage actions live on its detail page. */
export function ManagedEventCard({
  event,
  showManageLink = true,
}: {
  event: ManagedEvent;
  showManageLink?: boolean;
}) {
  return (
    <article className="flex flex-col gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-heading text-lg leading-snug font-semibold">{event.venueName}</h3>
        {event.recurrence ? (
          <Badge variant="outline" className="gap-1">
            <Repeat aria-hidden className="size-3" /> Recurring (mock)
          </Badge>
        ) : null}
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
          <dd>
            {formatTimeSpan(event)}
            {event.recurrence ? (
              <span className="text-muted-foreground"> · {event.recurrence.pattern}</span>
            ) : null}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Location</dt>
          <MapPin aria-hidden className="size-4 text-primary" />
          <dd>
            {event.street}, {event.city}, {event.state} {event.zip}
          </dd>
        </div>
      </dl>

      {showManageLink ? (
        <Link
          href={`/dashboard/church/events/${event.id}`}
          className={cn(buttonVariants({ variant: "outline" }), "w-fit")}
          aria-label={`Manage event at ${event.venueName}`}
        >
          Manage
        </Link>
      ) : null}
    </article>
  );
}
