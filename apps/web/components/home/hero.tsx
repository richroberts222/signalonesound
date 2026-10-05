import { Flame, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* Decorative CSS-only light: no imagery, hidden from assistive tech. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="signal-flame absolute left-1/2 top-[-10%] h-[70vh] w-[140%] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse_at_center,oklch(0.7_0.2_45/55%),oklch(0.75_0.16_70/25%)_40%,transparent_70%)] blur-2xl sm:w-[90%]" />
        <div className="absolute bottom-0 left-1/2 h-1/2 w-full -translate-x-1/2 bg-[radial-gradient(ellipse_at_bottom,oklch(0.55_0.2_30/45%),transparent_70%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
      </div>

      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-5 pb-24 pt-16 text-center sm:pt-24 md:pb-32 md:pt-32">
        <Badge variant="outline" className="h-6 gap-1.5 bg-background/40 px-3 text-sm backdrop-blur">
          <Flame aria-hidden="true" />
          Concept preview
        </Badge>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">
          <span className="signal-gold-text">Signal One</span>
        </h1>
        <p className="text-xl font-medium tracking-wide text-foreground sm:text-2xl">
          Holy. United. Awakened.
        </p>
        <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
          Find where revival is happening near you — worship nights, prayer
          gatherings, conferences, and more, all in one place.
        </p>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <Button size="lg" className="h-11 px-6 text-base shadow-[0_0_30px_oklch(0.8_0.17_70/45%)]" render={<a href="#find-revival" />}>
            <MapPin aria-hidden="true" />
            Find Revival
          </Button>
          <Button size="lg" variant="outline" className="h-11 px-6 text-base" render={<a href="#featured" />}>
            See what&apos;s coming
          </Button>
        </div>
      </div>
    </section>
  );
}
