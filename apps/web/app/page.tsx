import Link from "next/link";
import { Show, SignInButton, SignUpButton } from "@clerk/nextjs";
import { ArrowRight, Bell, Bookmark, Flame, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXAMPLE_EVENTS, FOR_CHURCHES, FOR_PEOPLE, HOW_IT_WORKS, PROBLEM } from "@/lib/marketing/content";

// The public landing page (S15, docs/features/s15-public-pages.md). Everything here is plain server-rendered
// content from lib/marketing/content.ts, so it is readable without JavaScript. The search box is an ordinary
// form that opens the real search with the typed place. Example events are static and labeled "Example"; the
// page makes no claim about numbers of users, churches or events.
const STEP_ICONS = [Search, Bookmark, Bell] as const;

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-hero-glow border-b">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Flame aria-hidden className="size-4" /> Revival discovery
          </p>
          <h1 className="font-heading max-w-3xl text-5xl leading-[1.02] font-extrabold tracking-tight sm:text-7xl">
            Find the fire <span className="text-gradient-gold">near you.</span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground sm:text-xl">
            Revival gatherings, tent meetings, worship nights, and prayer. Discover what God is doing in your area.
          </p>

          <form action="/events" method="get" className="flex w-full max-w-xl flex-col gap-2 sm:flex-row" role="search" aria-label="Find a revival near you">
            <Input name="place" aria-label="City, state or ZIP code" placeholder="City, state or ZIP code" maxLength={100} autoComplete="off" className="h-11 text-base" data-testid="home-place-input" />
            <Button type="submit" size="lg" className="h-11 px-5 text-base" data-testid="home-search-button">
              Find events <ArrowRight />
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="lg" className="h-11 px-5 text-base" nativeButton={false} render={<Link href="/events" data-testid="home-discover-button" />}>
              Browse all upcoming events
            </Button>
            <Show when="signed-out">
              <SignInButton>
                <Button variant="ghost" size="lg" className="h-11 px-4 text-base">
                  Sign in
                </Button>
              </SignInButton>
              <SignUpButton>
                <Button variant="ghost" size="lg" className="h-11 px-4 text-base">
                  Sign up free
                </Button>
              </SignUpButton>
            </Show>
            <Show when="signed-in">
              <Button variant="ghost" size="lg" className="h-11 px-5 text-base" nativeButton={false} render={<Link href="/dashboard" />}>
                Go to dashboard
              </Button>
            </Show>
          </div>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-14 px-4 py-12 sm:px-6 sm:py-16">
        <section aria-labelledby="problem-heading" className="max-w-3xl">
          <h2 id="problem-heading" className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            One place for what is happening, <span className="text-gradient-gold">across every denomination.</span>
          </h2>
          <p className="mt-3 text-muted-foreground sm:text-lg">{PROBLEM}</p>
        </section>

        <section aria-labelledby="how-heading" className="flex flex-col gap-4">
          <h2 id="how-heading" className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <li key={step.title} className="flex flex-col gap-2 rounded-xl border bg-card/60 p-5 backdrop-blur">
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/15 text-primary shadow-glow">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <h3 className="font-heading text-lg font-semibold">
                    {i + 1}. {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{step.text}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section aria-labelledby="examples-heading" className="flex flex-col gap-4">
          <div className="flex items-end justify-between gap-3">
            <h2 id="examples-heading" className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              What you will find
            </h2>
            <Link href="/events" className="text-sm font-medium text-primary hover:underline">
              Search real events
            </Link>
          </div>
          <ul className="grid gap-4 md:grid-cols-3">
            {EXAMPLE_EVENTS.map((event, i) => (
              <li key={event.title} className="flex flex-col gap-2 rounded-xl border bg-card/60 p-5" data-testid={`home-example-${i}`}>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline">Example</Badge>
                  <span className="text-xs text-muted-foreground">{event.kind}</span>
                </div>
                <h3 className="font-heading text-lg font-semibold">{event.title}</h3>
                <p className="text-sm text-muted-foreground">{event.about}</p>
                <p className="text-sm">
                  {event.where} &middot; {event.when}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">These are examples of what a listing looks like, not real events. Search to see what is happening near you.</p>
        </section>

        <section className="grid gap-6 md:grid-cols-2" aria-label="Who it is for">
          <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-6">
            <h2 className="font-heading text-xl font-bold">For people looking</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
              {FOR_PEOPLE.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <Link href="/events" className="text-sm font-medium text-primary hover:underline">
              Find a revival near you
            </Link>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border bg-card/60 p-6">
            <h2 className="font-heading text-xl font-bold">For churches and ministries</h2>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
              {FOR_CHURCHES.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <Link href="/services" className="text-sm font-medium text-primary hover:underline">
              See what is included
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
