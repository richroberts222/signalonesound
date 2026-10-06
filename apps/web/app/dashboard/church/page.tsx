import type { Metadata } from "next";
import Link from "next/link";
import { Compass, Plus, Settings2 } from "lucide-react";
import { ChurchMockNotice } from "@/components/church/mock-notice";
import { ManagedEventCard } from "@/components/church/managed-event-card";
import { buttonVariants } from "@/components/ui/button";
import { MANAGED_EVENTS, MOCK_CHURCH_NAME } from "@/lib/church/mock-data";

export const metadata: Metadata = {
  title: "Church/Ministry Dashboard | Signal One Sound",
};

export default function ChurchDashboardPage() {
  return (
    <>
      <ChurchMockNotice />

      <header className="flex flex-col gap-2">
        <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
          <Settings2 aria-hidden className="size-4" /> Managing events
        </p>
        <h1 className="font-heading text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">
          {MOCK_CHURCH_NAME}
        </h1>
        <p className="text-muted-foreground">
          Church/Ministry dashboard. Create and manage the events you want people to find.
        </p>
      </header>

      <section aria-labelledby="events-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="events-heading" className="font-heading text-xl font-semibold">
            Your events
          </h2>
          <Link href="/dashboard/church/events/new" className={buttonVariants({ size: "lg" })}>
            <Plus aria-hidden /> Create event
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">
          Upcoming and current events. You can submit as many events as you need.
        </p>
        {MANAGED_EVENTS.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            You have no events yet. Create your first event to get started.
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {MANAGED_EVENTS.map((event) => (
              <li key={event.id}>
                <ManagedEventCard event={event} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="discovery-heading"
        className="flex flex-col gap-2 rounded-xl border border-dashed p-4"
      >
        <h2 id="discovery-heading" className="font-heading flex items-center gap-2 text-base font-semibold">
          <Compass aria-hidden className="size-4 text-primary" /> Public discovery is separate
        </h2>
        <p className="text-sm text-muted-foreground">
          This dashboard is where you manage your events. Discover is what the public sees when they
          search for revival gatherings. In this mock the two are not connected, so changes here
          never appear in Discover.
        </p>
        <Link href="/discover" className={`${buttonVariants({ variant: "outline" })} w-fit`}>
          See how people discover events
        </Link>
      </section>
    </>
  );
}
