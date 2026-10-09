import type { Metadata } from "next";

import { DiscoverSearch } from "@/components/events/discover-search";

export const metadata: Metadata = {
  title: "Find a revival near you | Signal One Sound",
  description: "Search revival gatherings and church events by place, distance, date and kind of gathering. No account needed.",
};

// Public: no sign-in, and nothing is recorded about who searched.
export default function EventsPage() {
  return (
    <main className="flex flex-1 flex-col items-center gap-4 p-4 sm:p-8">
      <div className="flex w-full max-w-3xl flex-col gap-1">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Find a revival near you</h1>
        <p className="text-muted-foreground">Search by place, distance, date and kind of gathering. No account needed.</p>
      </div>
      <DiscoverSearch />
    </main>
  );
}
