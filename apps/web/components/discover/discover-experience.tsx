"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Flame, List, Map as MapIcon, SearchX } from "lucide-react";
import { DiscoverFilterPanel } from "@/components/discover/discover-filters";
import { EventCard } from "@/components/discover/event-card";
import { RevivalMap } from "@/components/discover/revival-map";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_FILTERS,
  filterEvents,
  filtersToQuery,
  parseFilters,
  type DiscoverFilters,
} from "@/lib/discover/filters";
import { formatCityState, formatDateSpan, formatMiles } from "@/lib/discover/format";
import { MOCK_EVENTS, MOCK_TODAY, findMockOrigin } from "@/lib/discover/mock-data";
import { cn } from "@/lib/utils";

const NEAR_ME_DELAY_MS = 700;
const MOCK_DEFAULT_ORIGIN = "nashville";

type View = "list" | "map";

/**
 * Discover Revival (mock): Near Me -> radius/date/Revival Type filters ->
 * list and map results -> Event Details. Filters live in the URL so Back from
 * Event Details restores the search and a search can be shared.
 */
export function DiscoverExperience() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const query = filtersToQuery(filters);

  const [view, setView] = useState<View>("list");
  const [locating, setLocating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const update = useCallback(
    (patch: Partial<DiscoverFilters>) => {
      const next = filtersToQuery({ ...filters, ...patch });
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    },
    [filters, pathname, router],
  );

  const onNearMe = () => {
    setLocating(true);
    clearTimeout(timer.current);
    // Simulated: a real "Near Me" would ask the device for permission/location.
    timer.current = setTimeout(() => {
      setLocating(false);
      update({ near: filters.near ?? MOCK_DEFAULT_ORIGIN });
    }, NEAR_ME_DELAY_MS);
  };

  const origin = findMockOrigin(filters.near);
  const results = useMemo(
    () => filterEvents(MOCK_EVENTS, filters, origin, MOCK_TODAY),
    [filters, origin],
  );
  const selected = results.find((r) => r.event.id === selectedId) ?? null;
  const hasActiveFilters = filters.date !== "any" || filters.types.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <DiscoverFilterPanel
        filters={filters}
        locating={locating}
        onNearMe={onNearMe}
        onChange={update}
        onClear={() => update({ date: DEFAULT_FILTERS.date, types: [] })}
        hasActiveFilters={hasActiveFilters}
      />

      {!origin ? (
        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
          <Flame aria-hidden className="size-8 text-primary" />
          <h2 className="font-heading text-xl font-semibold">Find revival near you</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Tap <strong>Near Me</strong> to see revival gatherings around you, then narrow by
            distance, date, and Revival Type.
          </p>
        </section>
      ) : (
        <section aria-labelledby="results-heading" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="results-heading" className="font-heading text-xl font-semibold" aria-live="polite">
              {results.length} {results.length === 1 ? "event" : "events"}{" "}
              <span className="text-base font-normal text-muted-foreground">
                {filters.radius === "any" ? "anywhere" : `within ${filters.radius} miles`} of {origin.label}
              </span>
            </h2>
            <Tabs value={view} onValueChange={(v) => setView(v as View)} className="lg:hidden">
              <TabsList aria-label="Results view">
                <TabsTrigger value="list">
                  <List /> List
                </TabsTrigger>
                <TabsTrigger value="map">
                  <MapIcon /> Map
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
              <SearchX aria-hidden className="size-8 text-muted-foreground" />
              <h3 className="font-heading text-lg font-semibold">No events match</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Try a wider distance, a different date, or fewer Revival Types.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {filters.radius !== "any" ? (
                  <Button type="button" variant="outline" onClick={() => update({ radius: "any" })}>
                    Search unlimited miles
                  </Button>
                ) : null}
                {hasActiveFilters ? (
                  <Button type="button" variant="outline" onClick={() => update({ date: "any", types: [] })}>
                    Clear date &amp; type filters
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
              <ul className={cn("flex flex-col gap-3", view === "map" && "hidden lg:flex")}>
                {results.map(({ event, distanceMiles }) => (
                  <li key={event.id}>
                    <EventCard
                      event={event}
                      distanceMiles={distanceMiles}
                      query={query}
                      selected={event.id === selectedId}
                      onHover={(id) => id && setSelectedId(id)}
                    />
                  </li>
                ))}
              </ul>

              <div className={cn("flex flex-col gap-3 lg:sticky lg:top-4", view === "list" && "hidden lg:flex")}>
                <RevivalMap
                  origin={origin}
                  radius={filters.radius}
                  results={results}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
                {selected ? (
                  <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-card-foreground">
                    <p className="font-heading text-base font-semibold">{selected.event.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDateSpan(selected.event)} · {formatCityState(selected.event.venue)}
                      {selected.distanceMiles !== null ? ` · ${formatMiles(selected.distanceMiles)} away` : ""}
                    </p>
                    <Button
                      nativeButton={false}
                      render={<Link href={`/discover/${selected.event.id}${query ? `?${query}` : ""}`} />}
                    >
                      View details <ArrowRight />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
