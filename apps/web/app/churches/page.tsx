import type { Metadata } from "next";
import Link from "next/link";

import { ChurchResultCard } from "@/components/churches/church-result-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { getChurchesService, getDiscoverService } from "@/lib/composition";
import { ServiceError } from "@/lib/services/errors";

// Find a Church (S18, docs/features/s18-find-a-church.md): public, no sign-in, nothing recorded about who searched.
// Search by a place (a city, state or ZIP code) and a distance, or by a church's name or city. Rendered on the server from a
// plain form, so it works without JavaScript.
export const metadata: Metadata = {
  title: "Find a Church | Signal One Sound",
  description: "Find a church near you and see when it meets every week. Search by place or by name. No account needed.",
};
export const dynamic = "force-dynamic";

const RADII = [10, 25, 50, 100];
const clean = (v: string | string[] | undefined, max: number): string => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) : "");

export default async function ChurchesPage({ searchParams }: PageProps<"/churches">) {
  const sp = await searchParams;
  const place = clean(sp.place, 100);
  const q = clean(sp.q, 100);
  const radius = RADII.includes(Number(sp.radius)) ? Number(sp.radius) : 25;
  const cursor = clean(sp.cursor, 200);

  // A typed place becomes a position from the same shipped Census data the events search uses.
  const match = place ? (await getDiscoverService().searchPlaces(place)).items[0] : undefined;
  const placeNotFound = place !== "" && !match;
  const search = async (withCursor: string) =>
    getChurchesService().search({ q: q || undefined, lat: match?.lat, lng: match?.lng, radius, cursor: withCursor || undefined, limit: 20 });
  let results;
  try {
    results = await search(cursor);
  } catch (error) {
    if (!(error instanceof ServiceError) || error.code !== "validation_failed") throw error;
    results = await search(""); // a stale or altered page link starts again from the first page
  }

  const params = new URLSearchParams();
  if (place) params.set("place", place);
  if (q) params.set("q", q);
  if (radius !== 25) params.set("radius", String(radius));
  const nextHref = results.nextCursor ? `/churches?${new URLSearchParams([...params, ["cursor", results.nextCursor]]).toString()}` : null;
  const summary = match
    ? `${results.items.length === 0 ? "No churches" : "Churches"} within ${radius} miles of ${match.label}`
    : q
      ? `Churches matching "${q}"`
      : "Churches, A to Z";

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
          <span className="text-gradient-gold">Find a Church</span>
        </h1>
        <p className="text-muted-foreground">See where a church is and when it meets every week. No account needed.</p>
      </div>

      <form action="/churches" method="get" role="search" aria-label="Find a church" className="flex flex-col gap-3 rounded-xl border p-4 sm:grid sm:grid-cols-[1fr_1fr_7rem_auto] sm:items-end">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="churches-place">Near (city, state or ZIP)</Label>
          <Input id="churches-place" name="place" defaultValue={place} maxLength={100} autoComplete="off" placeholder="Boise, ID or 83702" data-testid="churches-search-input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="churches-name">Church name or city</Label>
          <Input id="churches-name" name="q" defaultValue={q} maxLength={100} autoComplete="off" placeholder="Grace Fellowship" data-testid="churches-name-input" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="churches-radius">Within</Label>
          <NativeSelect id="churches-radius" name="radius" defaultValue={String(radius)} data-testid="churches-radius">
            {RADII.map((r) => (
              <option key={r} value={r}>
                {r} miles
              </option>
            ))}
          </NativeSelect>
        </div>
        <Button type="submit" data-testid="churches-search-submit">
          Search
        </Button>
      </form>

      {placeNotFound && (
        <p role="alert" className="text-sm text-destructive" data-testid="churches-place-not-found">
          We could not find that place. Try a ZIP code, or a city and state such as Boise, ID. Showing churches by name instead.
        </p>
      )}

      <section aria-labelledby="churches-summary" className="flex flex-col gap-3">
        <h2 id="churches-summary" className="font-heading text-xl font-bold" data-testid="churches-summary">
          {summary}
        </h2>
        {results.items.length === 0 ? (
          <p className="text-muted-foreground" data-testid="churches-empty">
            No churches found yet. Try a wider distance or another place. Is yours missing? Ask your church to{" "}
            <Link href="/claim-church" className="underline underline-offset-2" data-testid="churches-join-link">
              join Signal One Sound
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Churches">
            {results.items.map((c, i) => (
              <li key={c.id}>
                <ChurchResultCard church={c} index={i} />
              </li>
            ))}
          </ul>
        )}
        {nextHref && (
          <Link href={nextHref} className="w-fit rounded-md border px-4 py-2 text-sm font-medium hover:border-primary" data-testid="churches-next">
            More churches
          </Link>
        )}
      </section>
    </main>
  );
}
