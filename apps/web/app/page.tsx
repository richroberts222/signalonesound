import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowRight, CalendarDays, Flame, MapPin, SlidersHorizontal } from "lucide-react";
import { EventCard } from "@/components/discover/event-card";
import { Button } from "@/components/ui/button";
import { MOCK_EVENTS, MOCK_TODAY } from "@/lib/discover/mock-data";

const STEPS = [
  { icon: MapPin, title: "Near Me", text: "See revival gatherings around you, closest first." },
  { icon: SlidersHorizontal, title: "Narrow it down", text: "Filter by distance, date, and Revival Type." },
  { icon: CalendarDays, title: "Go", text: "Event details, directions, share, and save." },
];

export default function Home() {
  const featured = [...MOCK_EVENTS]
    .filter((e) => (e.endDate ?? e.date) >= MOCK_TODAY)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-hero-glow border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 pt-16 pb-24 sm:px-6 sm:pt-24 sm:pb-32">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Flame aria-hidden className="size-4" /> Revival discovery
          </p>
          <h1 className="font-heading max-w-3xl text-5xl leading-[1.02] font-extrabold tracking-tight sm:text-7xl">
            Find the fire <span className="text-gradient-gold">near you.</span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
            Revival gatherings, tent meetings, worship nights, and prayer. Discover what God is doing
            in your area.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" className="h-11 px-5 text-base" nativeButton={false} render={<Link href="/discover" />}>
              Discover revival near you <ArrowRight />
            </Button>
            <Show when="signed-out">
              <SignInButton>
                <Button variant="outline" size="lg" className="h-11 px-5 text-base">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton>
                <Button variant="ghost" size="lg" className="h-11 px-4 text-base">
                  Sign up
                </Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button variant="outline" size="lg" className="h-11 px-5 text-base" render={<Link href="/dashboard" />}>
                Go to dashboard
              </Button>
            </Show>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 sm:py-16">
        <ul className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex flex-col gap-2 rounded-xl border bg-card/60 p-5 backdrop-blur">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary shadow-glow">
                <Icon aria-hidden className="size-5" />
              </span>
              <h2 className="font-heading text-lg font-semibold">{title}</h2>
              <p className="text-sm text-muted-foreground">{text}</p>
            </li>
          ))}
        </ul>

        <section aria-labelledby="featured-heading" className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <h2 id="featured-heading" className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Happening <span className="text-gradient-gold">soon</span>
            </h2>
            <Link href="/discover?near=nashville&radius=any" className="text-sm font-medium text-primary hover:underline">
              See all
            </Link>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {featured.map((event) => (
              <li key={event.id}>
                <EventCard event={event} distanceMiles={null} query="from=home" />
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">Mock preview: all events are fictional.</p>
        </section>
      </div>
    </main>
  );
}
