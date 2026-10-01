"use client";

import { useState } from "react";
import { Calendar, Church, MapPin, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  eventTypes,
  gatherings,
  mapPins,
  type EventType,
} from "./mock-data";

// Visual states only: filtering is a local in-memory view over static mock
// data. Nothing is fetched, submitted, or persisted.
export function RevivalFinder() {
  const [active, setActive] = useState<EventType>("All");
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visible = gatherings.filter(
    (g) =>
      (active === "All" || g.type === active) &&
      (q === "" ||
        `${g.title} ${g.host} ${g.place}`.toLowerCase().includes(q)),
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-5 pb-24">
      <section id="find-revival" aria-labelledby="find-heading" className="scroll-mt-20">
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="flex flex-col gap-5 lg:col-span-3">
            <div>
              <h2 id="find-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Find Revival
              </h2>
              <p className="mt-1 text-muted-foreground">
                Gatherings near you. Sample data for design review.
              </p>
            </div>

            <form
              role="search"
              onSubmit={(e) => e.preventDefault()}
              className="flex flex-col gap-2 sm:flex-row"
            >
              <div className="relative flex-1">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  aria-label="Search gatherings, churches, or places"
                  placeholder="Search gatherings or churches"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-11 bg-background/50 pl-9 text-base"
                />
              </div>
              <Button type="button" variant="outline" className="h-11 px-4 text-base" aria-label="Near me (concept only)">
                <MapPin aria-hidden="true" />
                Near Me
              </Button>
            </form>

            <div role="group" aria-label="Filter by event type" className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {eventTypes.map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="lg"
                  variant={active === t ? "default" : "outline"}
                  aria-pressed={active === t}
                  onClick={() => setActive(t)}
                  className="h-10 shrink-0 rounded-full px-4 text-sm"
                >
                  {t}
                </Button>
              ))}
            </div>
          </div>

          <MapPreview />
        </div>
      </section>

      <section id="featured" aria-labelledby="featured-heading" className="scroll-mt-20">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="featured-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Upcoming gatherings
          </h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {visible.length} shown
          </p>
        </div>

        {visible.length === 0 ? (
          <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            No sample gatherings match. Try another filter.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((g) => (
              <li key={g.id} className="flex">
                <Card className="w-full bg-card ring-1 ring-primary/20 backdrop-blur transition-shadow hover:shadow-[0_0_32px_oklch(0.75_0.16_65/25%)]">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Badge variant={g.featured ? "default" : "secondary"}>{g.type}</Badge>
                      {g.featured && <Badge variant="outline">Featured</Badge>}
                    </div>
                    <CardTitle className="mt-2 text-lg">{g.title}</CardTitle>
                    <CardDescription className="text-muted-foreground">{g.blurb}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1.5 text-sm">
                    <p className="flex items-center gap-2"><Calendar aria-hidden="true" className="size-4 text-primary" />{g.when}</p>
                    <p className="flex items-center gap-2"><MapPin aria-hidden="true" className="size-4 text-primary" />{g.place} · {g.distance}</p>
                    <p className="flex items-center gap-2 text-muted-foreground"><Church aria-hidden="true" className="size-4 text-primary" />{g.host}</p>
                  </CardContent>
                  <CardFooter>
                    <Button type="button" variant="outline" className="h-10 w-full">
                      View details
                    </Button>
                  </CardFooter>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MapPreview() {
  return (
    <div
      role="img"
      aria-label="Abstract map preview with five glowing gathering markers"
      className="relative min-h-56 overflow-hidden rounded-2xl border bg-card lg:col-span-2 lg:min-h-0"
    >
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(oklch(0.75_0.14_70/9%)_1px,transparent_1px),linear-gradient(90deg,oklch(0.75_0.14_70/9%)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_50%_55%,oklch(0.7_0.2_45/30%),transparent_65%)]" />
      {mapPins.map((p) => (
        <span
          key={p.id}
          aria-hidden="true"
          style={{ top: p.top, left: p.left }}
          className="signal-flame absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_18px_6px_oklch(0.8_0.17_70/55%)]"
        />
      ))}
      <span className="absolute bottom-3 left-3 rounded-full bg-background/70 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
        Map preview · concept
      </span>
    </div>
  );
}
