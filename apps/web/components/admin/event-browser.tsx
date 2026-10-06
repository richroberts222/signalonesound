"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { EventStatusBadge, SourceBadge } from "@/components/admin/badges";
import { EmptyState } from "@/components/admin/empty-state";
import { FilterChip } from "@/components/discover/filter-chip";
import { Input } from "@/components/ui/input";
import { SOURCE_LABEL } from "@/lib/admin/labels";
import { matchesQuery } from "@/lib/admin/moderation";
import type { EventSource, MockAdminEvent } from "@/lib/admin/types";
import { formatDay, formatTime } from "@/lib/discover/format";

const SOURCES = Object.keys(SOURCE_LABEL) as EventSource[];

/** Searchable, source-filterable list of fictional events. */
export function EventBrowser({ events }: { events: MockAdminEvent[] }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<EventSource | null>(null);
  const shown = events.filter(
    (e) =>
      (source === null || e.source === source) &&
      matchesQuery(query, [e.title, e.orgName, e.venueName, e.city]),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="event-search" className="text-sm font-medium">
          Search events
        </label>
        <Input
          id="event-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Title, organization, venue, city"
        />
      </div>

      <div role="group" aria-label="Filter by source" className="flex flex-wrap gap-2">
        <FilterChip active={source === null} onClick={() => setSource(null)}>
          All sources
        </FilterChip>
        {SOURCES.map((s) => (
          <FilterChip key={s} active={source === s} onClick={() => setSource(source === s ? null : s)}>
            {SOURCE_LABEL[s]}
          </FilterChip>
        ))}
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing {shown.length} of {events.length}
      </p>

      {shown.length === 0 ? (
        <EmptyState title="No events match">
          Clear the search or choose &quot;All sources&quot; to see every fictional event.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((e) => (
            <li key={e.id}>
              <Link
                href={`/admin/events/${e.id}`}
                className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground shadow-xs transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-heading text-lg leading-snug font-semibold">{e.title}</span>
                  <span className="flex flex-wrap gap-1.5">
                    <EventStatusBadge status={e.status} />
                    <SourceBadge source={e.source} />
                  </span>
                </span>
                <span className="text-sm text-muted-foreground">{e.orgName}</span>
                <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays aria-hidden className="size-4 text-primary" />
                    {formatDay(e.date)} · {formatTime(e.startTime)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin aria-hidden className="size-4 text-primary" />
                    {e.venueName}, {e.city}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
