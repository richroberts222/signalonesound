import Link from "next/link";
import type { PublicEvent } from "@signalone/validation";
import { REVIVAL_TYPES } from "@signalone/validation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const typeLabel = (slug: string) => REVIVAL_TYPES.find((t) => t.slug === slug)?.label ?? slug;

/** When the event happens, in the event's own time zone, so it reads the same wherever it is viewed. */
export function whenText(e: Pick<PublicEvent, "startsAt" | "timeZone">): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: e.timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(e.startsAt));
}

// One event in a list: what, when, where and how far. The whole card is one link to the event page.
export function EventCard({ event, index }: { event: PublicEvent; index: number }) {
  return (
    <Card className="transition-colors hover:border-primary">
      <CardContent>
        <Link href={`/events/${event.id}`} className="flex flex-col gap-1.5 outline-none focus-visible:underline" data-testid={`discover-result-${index}`}>
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-lg font-bold">{event.title}</span>
            {event.status === "cancelled" && <Badge variant="destructive">Cancelled</Badge>}
          </span>
          <span className="text-sm text-muted-foreground">{event.organization.name}</span>
          <span className="text-sm">{whenText(event)}</span>
          <span className="text-sm text-muted-foreground">
            {event.venueName}, {event.city}, {event.state}
            {event.distanceMiles !== null && ` · ${event.distanceMiles.toFixed(1)} mi`}
          </span>
          <span className="flex flex-wrap gap-1.5">
            {event.revivalTypes.map((t) => (
              <Badge key={t} variant="outline">
                {typeLabel(t)}
              </Badge>
            ))}
          </span>
        </Link>
      </CardContent>
    </Card>
  );
}
