import type { Metadata } from "next";
import Link from "next/link";
import type { Fire, FireView } from "@signalone/validation";

import { FireMapSvg } from "@/components/fire-map/fire-map-svg";
import { FireMapTabs } from "@/components/fire-map/fire-map-tabs";
import { getFireMapService } from "@/lib/composition";

// The public Fire Map (S16, docs/features/s16-fire-map.md): where revival is happening, with honest numbers.
// Computed on the server from the same events the search shows; readable without JavaScript.
export const metadata: Metadata = {
  title: "Fire Map",
  description: "A map of the revival gatherings happening now, with the share of land and regions they reach.",
};
export const dynamic = "force-dynamic";

const percent = (n: number) => `${Number(n.toFixed(4))}%`;

function Tracker({ id, view, label, regionNoun }: { id: string; view: FireView; label: string; regionNoun: string }) {
  return (
    <section aria-label={`${label} numbers`} className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Fires burning</p>
        <p data-testid={`fire-map-count-${id}`} className="font-heading text-3xl font-bold">
          {view.fires}
        </p>
      </div>
      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">{regionNoun} with a fire</p>
        <p data-testid={`fire-map-regions-${id}`} className="font-heading text-3xl font-bold">
          {view.regionsWithFire} <span className="text-lg font-medium text-muted-foreground">of {view.regionsTotal}</span>
        </p>
      </div>
      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Land under fire</p>
        <p data-testid={`fire-map-land-${id}`} className="font-heading text-3xl font-bold">
          {percent(view.landPercent)}
        </p>
      </div>
    </section>
  );
}

function Panel({ id, label, regionNoun, view, fires }: { id: "world" | "us"; label: string; regionNoun: string; view: FireView; fires: Fire[] }) {
  return (
    <div className="flex flex-col gap-4">
      <Tracker id={id} view={view} label={label} regionNoun={regionNoun} />
      {view.fires === 0 && <p className="text-muted-foreground">No fires yet. When a gathering is published, it will light up here.</p>}
      <FireMapSvg view={id} fires={fires} />
    </div>
  );
}

function RegionList({ title, view }: { title: string; view: FireView }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-heading text-xl font-bold">{title}</h3>
      {view.regions.length === 0 ? (
        <p className="text-muted-foreground">No fires yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {view.regions.map((r) => (
            <li key={r.name}>
              <p className="font-medium">{r.name}</p>
              <ul className="ml-4 list-disc text-sm text-muted-foreground">
                {r.events.map((e) => (
                  <li key={e.id}>
                    <Link href={`/events/${e.id}`} data-testid="fire-map-region-link" className="underline underline-offset-2 hover:text-foreground">
                      {e.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function FireMapPage() {
  const map = await getFireMapService().getFireMap();
  const usIds = new Set(map.us.regions.flatMap((r) => r.events.map((e) => e.id)));
  const usFires = map.fires.filter((f) => usIds.has(f.id));
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
          Fire <span className="text-gradient-gold">Map</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Every revival gathering that is on now or coming up is a fire. Where its light falls, the darkness lifts.
        </p>
      </header>

      <FireMapTabs
        world={<Panel id="world" label="World" regionNoun="Countries" view={map.world} fires={map.fires} />}
        us={<Panel id="us" label="United States" regionNoun="States" view={map.us} fires={usFires} />}
      />

      <details data-testid="fire-map-method" className="rounded-xl border p-4">
        <summary className="cursor-pointer font-medium">How we count</summary>
        <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
          <p>A fire is a published gathering with a place that has not finished yet. Cancelled and past gatherings, and gatherings online only, are not shown.</p>
          <p>
            Each fire lights about 10 miles around it. <strong>Land under fire</strong> is the share of the land area that lies within 10 miles of at least one fire; fires that overlap are not
            counted twice. Water is not counted.
          </p>
          <p>
            The outlines are simplified public-domain maps (Natural Earth), so coasts and borders are approximate to roughly ten miles and the percentages are estimates. Updated{" "}
            {new Date(map.asOf).toUTCString()}.
          </p>
        </div>
      </details>

      <section aria-labelledby="fire-list-heading" data-testid="fire-map-list" className="flex flex-col gap-6">
        <h2 id="fire-list-heading" className="font-heading text-2xl font-bold">
          Where the fires are
        </h2>
        <div className="grid gap-8 md:grid-cols-2">
          <RegionList title="Countries" view={map.world} />
          <RegionList title="United States" view={map.us} />
        </div>
      </section>
    </main>
  );
}
