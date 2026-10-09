"use client";

import { useMemo, useState } from "react";
import {
  RADIUS_CHOICES,
  REVIVAL_TYPES,
  createApiClient,
  createDiscoverClient,
  roundPosition,
  type PublicEvent,
} from "@signalone/validation";

import { DATE_PRESET_LABELS, presetRange, type DatePreset } from "@/lib/date-presets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

import { EventCard } from "./event-card";

type Place = { label: string; lat: number; lng: number };

// Find events (S4). Anyone can use it, signed in or not. A place is typed (a ZIP code or City, ST) or
// found from the device, and only after the person taps the button. The position is rounded to about
// one kilometre before it is sent, and the server keeps no record of the search.
export function DiscoverSearch() {
  const client = useMemo(() => createDiscoverClient(createApiClient({ baseUrl: "" })), []);
  const [placeText, setPlaceText] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [choices, setChoices] = useState<Place[]>([]);
  const [radius, setRadius] = useState("25");
  const [preset, setPreset] = useState<DatePreset>("any");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [items, setItems] = useState<PublicEvent[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dates = preset === "custom" ? { from: from || undefined, to: to || undefined } : presetRange(preset) ?? {};

  async function run(chosen: Place | null, cursor?: string) {
    setBusy(true);
    setError(null);
    const result = await client.searchEvents({
      ...(chosen ? { lat: roundPosition(chosen.lat), lng: roundPosition(chosen.lng), radius: radius === "any" ? ("any" as const) : Number(radius) } : {}),
      ...dates,
      types,
      ...(cursor ? { cursor } : {}),
    });
    if (result.ok) {
      setItems((current) => (cursor ? [...current, ...result.data.items] : result.data.items));
      setNext(result.data.nextCursor);
      setSearched(true);
    } else {
      setError(result.error.fieldErrors ? Object.values(result.error.fieldErrors)[0]?.[0] ?? result.error.message : result.error.message);
    }
    setBusy(false);
  }

  async function onSearch(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setChoices([]);
    let chosen = place;
    if (placeText.trim() !== "" && placeText.trim() !== place?.label) {
      const found = await client.searchPlaces(placeText.trim());
      if (!found.ok) return setError(found.error.message);
      if (found.data.items.length === 0) {
        setPlace(null);
        return setMessage("We could not find that place. Try a ZIP code or City, ST.");
      }
      if (found.data.items.length > 1) return setChoices(found.data.items);
      chosen = found.data.items[0];
      setPlace(chosen);
      setPlaceText(chosen.label);
    }
    await run(chosen);
  }

  function useMyLocation() {
    setMessage(null);
    if (!("geolocation" in navigator)) return setMessage("Location is not available on this device. Type a place instead.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const mine = { label: "Near me", lat: roundPosition(pos.coords.latitude), lng: roundPosition(pos.coords.longitude) };
        setPlace(mine);
        setPlaceText(mine.label);
        void run(mine);
      },
      () => setMessage("Location is off. Type a place instead."),
      { maximumAge: 600_000, timeout: 10_000 },
    );
  }

  const toggleType = (slug: string) => setTypes((t) => (t.includes(slug) ? t.filter((x) => x !== slug) : [...t, slug]));

  return (
    <div className="flex w-full max-w-3xl flex-col gap-5">
      <form onSubmit={onSearch} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="discover-place">City, state or ZIP code</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="discover-place"
              className="min-w-0 flex-1"
              value={placeText}
              onChange={(e) => setPlaceText(e.target.value)}
              placeholder="Nashville, TN or 37201"
              autoComplete="off"
              data-testid="discover-place-input"
            />
            <Button type="button" variant="outline" onClick={useMyLocation} data-testid="discover-locate-button">
              Use my location
            </Button>
          </div>
        </div>
        {choices.length > 0 && (
          <div role="group" aria-label="Which place did you mean?" className="flex flex-wrap gap-2">
            {choices.map((c, i) => (
              <Button
                key={`${c.label}-${i}`}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setPlace(c);
                  setPlaceText(c.label);
                  setChoices([]);
                  void run(c);
                }}
                data-testid={`discover-place-choice-${i}`}
              >
                {c.label}
              </Button>
            ))}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discover-radius">How far</Label>
            <NativeSelect id="discover-radius" value={radius} onChange={(e) => setRadius(e.target.value)} data-testid="discover-radius-select">
              {RADIUS_CHOICES.map((r) => (
                <option key={r} value={String(r)}>
                  Within {r} miles
                </option>
              ))}
              <option value="any">Any distance</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="discover-date">When</Label>
            <NativeSelect id="discover-date" value={preset} onChange={(e) => setPreset(e.target.value as DatePreset)} data-testid="discover-date-select">
              {(Object.keys(DATE_PRESET_LABELS) as DatePreset[]).map((p) => (
                <option key={p} value={p}>
                  {DATE_PRESET_LABELS[p]}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        {preset === "custom" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discover-from">From</Label>
              <Input id="discover-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} data-testid="discover-date-from" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="discover-to">To</Label>
              <Input id="discover-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} data-testid="discover-date-to" />
            </div>
          </div>
        )}
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm">Kind of gathering</legend>
          <div className="flex flex-wrap gap-2">
            {REVIVAL_TYPES.map((t) => (
              <Button
                key={t.slug}
                type="button"
                size="sm"
                variant={types.includes(t.slug) ? "default" : "outline"}
                aria-pressed={types.includes(t.slug)}
                onClick={() => toggleType(t.slug)}
                data-testid={`discover-type-${t.slug}`}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </fieldset>
        <Button type="submit" disabled={busy} className="w-fit" data-testid="discover-search-button">
          {busy ? "Searching..." : "Find events"}
        </Button>
      </form>

      {message && (
        <p role="status" className="text-sm text-muted-foreground" data-testid="discover-message">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="discover-error">
          {error}
        </p>
      )}
      {searched && items.length === 0 && <p data-testid="discover-empty">No events match. Try a wider distance or different dates.</p>}
      <ul className="flex flex-col gap-3" aria-label="Events">
        {items.map((e, i) => (
          <li key={e.id}>
            <EventCard event={e} index={i} />
          </li>
        ))}
      </ul>
      {next && (
        <Button variant="outline" className="w-fit" disabled={busy} onClick={() => void run(place, next)} data-testid="discover-load-more">
          Load more
        </Button>
      )}
    </div>
  );
}
