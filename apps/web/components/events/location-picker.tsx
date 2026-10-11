"use client";

import { useEffect, useRef, useState } from "react";
import type { LatLng, Map as LeafletMap, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { LocateFixed, Search, X } from "lucide-react";
import { pinSchema, type Pin } from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COORDINATES_HELP, formatPin, parseCoordinates, roundPin } from "@/lib/location/coordinates";
import { mapConfig } from "@/lib/location/map-config";
import { searchPlaces, type PlaceResult } from "@/lib/location/search";

// The location picker on the event form (S17, docs/features/s17-event-location.md). The organizer finds the place on a
// real street map (search it by name, tap it, drag the pin, or use their own location) and never has to type
// coordinates; a paste box is there for those who have them. The pin is the only thing this hands back; the server
// checks it again. The map service is contacted only from here, on the signed-in organizer form. If the map cannot
// load, everything else on the form still works.
type Props = { value: Pin | null; onChange: (pin: Pin | null) => void; searchSeed: string };

const PIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42" aria-hidden="true"><path d="M15 1C7.3 1 1 7.2 1 14.8 1 25 15 41 15 41s14-16 14-26.2C29 7.2 22.7 1 15 1z" fill="#ffac2a" stroke="#1a1208" stroke-width="2"/><circle cx="15" cy="15" r="5.5" fill="#1a1208"/></svg>';
const NUDGE_PX = 12;
const WORLD_CENTER: [number, number] = [20, 0];

type Leaflet = typeof import("leaflet");

export function LocationPicker({ value, onChange, searchSeed }: Props) {
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const leafletRef = useRef<Leaflet | null>(null);
  const fromMap = useRef(false);
  // The latest callback and pin, for the map's own event handlers, which are made once.
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  useEffect(() => {
    onChangeRef.current = onChange;
    valueRef.current = value;
  });

  const [query, setQuery] = useState(searchSeed);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [placeName, setPlaceName] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [paste, setPaste] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [mapProblem, setMapProblem] = useState(false);
  const [ready, setReady] = useState(false);

  // A pin placed by the person tapping or dragging the map itself.
  const placeFromMap = (point: LatLng) => {
    const wrapped = point.wrap();
    const checked = pinSchema.safeParse({ lat: wrapped.lat, lng: wrapped.lng });
    if (!checked.success) return;
    fromMap.current = true;
    setPlaceName(null);
    setNotice("");
    onChangeRef.current(roundPin(checked.data));
  };

  // Build the map once, in the browser only (the library needs the page), and load it only when this form is shown.
  useEffect(() => {
    let cancelled = false;
    let loaded = 0;
    let failed = 0;
    (async () => {
      try {
        const mod = (await import("leaflet")) as unknown as Leaflet & { default?: Leaflet };
        const L = mod.default ?? mod;
        if (cancelled || !mapNode.current) return;
        leafletRef.current = L;
        const config = mapConfig();
        const start = valueRef.current;
        const map = L.map(mapNode.current, { center: start ? [start.lat, start.lng] : WORLD_CENTER, zoom: start ? 15 : 2, worldCopyJump: true });
        const tiles = L.tileLayer(config.tileUrl, { maxZoom: config.maxZoom, attribution: config.attribution });
        tiles.on("tileload", () => {
          loaded += 1;
          setMapProblem(false);
        });
        tiles.on("tileerror", () => {
          failed += 1;
          if (loaded === 0 && failed >= 3) setMapProblem(true);
        });
        tiles.addTo(map);
        map.on("click", (e) => placeFromMap(e.latlng));
        mapRef.current = map;
        setReady(true);
      } catch {
        if (!cancelled) setMapProblem(true);
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // The map is built once; later changes arrive through the pin effect below.
  }, []);

  // Keep the pin on the map in step with the value: add, move or remove it, and bring a pin set from outside into view.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    const at: [number, number] = [value.lat, value.lng];
    if (markerRef.current) {
      markerRef.current.setLatLng(at);
    } else {
      const marker = L.marker(at, {
        draggable: true,
        keyboard: true,
        title: "Event location. Drag it, or use the arrow keys when it is focused, to move it.",
        alt: "Event location pin",
        icon: L.divIcon({ className: "", html: PIN_SVG, iconSize: [30, 42], iconAnchor: [15, 41] }),
      }).addTo(map);
      marker.on("dragend", () => placeFromMap(marker.getLatLng()));
      marker.getElement()?.addEventListener("keydown", (event: KeyboardEvent) => {
        const step: Record<string, [number, number]> = { ArrowUp: [0, -NUDGE_PX], ArrowDown: [0, NUDGE_PX], ArrowLeft: [-NUDGE_PX, 0], ArrowRight: [NUDGE_PX, 0] };
        const move = step[event.key];
        if (!move) return;
        event.preventDefault();
        event.stopPropagation();
        const here = map.latLngToContainerPoint(marker.getLatLng());
        placeFromMap(map.containerPointToLatLng([here.x + move[0], here.y + move[1]]));
      });
      markerRef.current = marker;
    }
    if (fromMap.current) fromMap.current = false;
    else map.setView(at, Math.max(map.getZoom(), 14));
  }, [value, ready]);

  async function runSearch() {
    if (query.trim() === "") return;
    setSearching(true);
    setNotice("");
    try {
      const places = await searchPlaces(query, { baseUrl: mapConfig().searchUrl });
      setResults(places);
      if (places.length === 0) setNotice("No places found. Try a nearby town or landmark, or tap the map.");
    } catch {
      setResults([]);
      setNotice("Place search is not available right now. You can tap the map or paste coordinates, or save without a pin.");
    }
    setSearching(false);
  }

  function choose(place: PlaceResult) {
    fromMap.current = false;
    setPlaceName(place.label);
    setResults([]);
    setNotice("");
    onChange(place.pin);
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setNotice("This device cannot share its location. Search for the place or tap the map instead.");
      return;
    }
    setLocating(true);
    setNotice("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const checked = pinSchema.safeParse({ lat: position.coords.latitude, lng: position.coords.longitude });
        if (!checked.success) return setNotice("Your location could not be read. Search for the place or tap the map instead.");
        fromMap.current = false;
        setPlaceName("your current location");
        onChange(roundPin(checked.data));
      },
      (error) => {
        setLocating(false);
        setNotice(
          error.code === error.PERMISSION_DENIED
            ? "Location sharing was declined. You can search for the place or tap the map instead."
            : "Your location is not available right now. Search for the place or tap the map instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  function pasteChanged(text: string) {
    setPaste(text);
    if (text.trim() === "") return setPasteError(null);
    const parsed = parseCoordinates(text);
    if (!parsed.ok) return setPasteError(parsed.message);
    setPasteError(null);
    fromMap.current = false;
    setPlaceName(null);
    setNotice("");
    onChange(parsed.pin);
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3" data-testid="location-picker">
      <legend className="px-1 text-sm font-medium">Where is it on the map?</legend>
      <p className="text-sm text-muted-foreground">
        Search for the place, or tap the map to drop a pin and zoom in for the exact spot. This is what puts the gathering on the Fire Map and in nearby searches. Your address above is shown to visitors as you typed it.
      </p>

      <div className="flex gap-2">
        <Input
          aria-label="Search for a place"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void runSearch();
            }
          }}
          placeholder="Village, town, church or address"
          data-testid="location-search"
        />
        <Button type="button" variant="outline" disabled={searching} onClick={() => void runSearch()} data-testid="location-search-submit">
          <Search aria-hidden /> {searching ? "Searching" : "Search"}
        </Button>
      </div>

      {results.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label="Places found">
          {results.map((place, i) => (
            <li key={`${place.label}-${i}`}>
              <Button type="button" variant="ghost" className="h-auto w-full justify-start whitespace-normal py-2 text-left font-normal" onClick={() => choose(place)} data-testid={`location-result-${i}`}>
                {place.label}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div
        ref={mapNode}
        role="region"
        aria-label="Map. Tap to place the pin. When the pin is focused, the arrow keys move it."
        className="h-72 w-full overflow-hidden rounded-lg border border-border bg-card"
        data-testid="location-map"
      />
      {mapProblem && (
        <p role="status" className="text-sm text-destructive" data-testid="location-map-problem">
          The map could not load. You can still paste coordinates below, or save the gathering without a pin and add one later.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={locating} onClick={useMyLocation} data-testid="location-use-mine">
          <LocateFixed aria-hidden /> {locating ? "Finding you" : "Use my location"}
        </Button>
        <Button type="button" variant="outline" disabled={!value} onClick={() => { fromMap.current = false; setPlaceName(null); setNotice("Pin removed."); onChange(null); }} data-testid="location-clear">
          <X aria-hidden /> Clear pin
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="event-coordinates">Have coordinates? Paste them here (optional)</Label>
        <Input id="event-coordinates" value={paste} onChange={(e) => pasteChanged(e.target.value)} placeholder="36.1627, -86.7816" inputMode="decimal" aria-invalid={pasteError ? true : undefined} aria-describedby="event-coordinates-help" data-testid="location-coordinates" />
        <p id="event-coordinates-help" className={pasteError ? "text-sm text-destructive" : "text-sm text-muted-foreground"} role={pasteError ? "alert" : undefined}>
          {pasteError ?? COORDINATES_HELP}
        </p>
      </div>

      <p aria-live="polite" className="text-sm" data-testid="location-status">
        {value ? `Pin set at ${formatPin(value)}${placeName ? `, near ${placeName}` : ""}.` : "No pin yet."} {notice}
      </p>
      {!value && (
        <p className="rounded-md border border-border bg-muted p-2 text-sm text-muted-foreground" data-testid="location-missing-notice">
          This gathering will not appear on the Fire Map or in nearby searches until it has a location. You can still save and publish it, and add a pin later.
        </p>
      )}
    </fieldset>
  );
}
