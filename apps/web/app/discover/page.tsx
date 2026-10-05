import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { DiscoverExperience } from "@/components/discover/discover-experience";
import { MockBanner } from "@/components/discover/mock-banner";

export const metadata: Metadata = {
  title: "Discover Revival | Signal One Sound",
  description: "Find revival gatherings near you by distance, date, and Revival Type.",
};

export default function DiscoverPage() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="bg-hero text-hero-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-10 sm:px-6 sm:py-14">
          <BrandWordmark className="text-sm text-highlight" />
          <h1 className="font-heading max-w-2xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            Find the fire <span className="text-highlight">near you.</span>
          </h1>
          <p className="max-w-xl text-base text-hero-foreground/80 sm:text-lg">
            Revival gatherings, tent meetings, worship nights, and prayer: discover what God is
            doing in your area.
          </p>
          <p className="max-w-xl border-l-2 border-primary pl-3 text-sm text-hero-foreground/70 italic">
            “Prepare in the wilderness the way of the Lord.” (Isaiah 40:3)
          </p>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
        <MockBanner />
        <Suspense fallback={<p className="text-sm text-muted-foreground">Loading discovery…</p>}>
          <DiscoverExperience />
        </Suspense>
      </div>
    </main>
  );
}
