"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { localToUtc, parseLocalDateTime } from "@signalone/shared";
import {
  EVENT_LINK_MAX,
  REVIVAL_TYPES,
  US_STATES,
  createApiClient,
  createEventClient,
  type CreateEventInput,
  type EventView,
} from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

import { EVENT_TIME_ZONES, defaultTimeZone } from "./time-zones";

type Props = { orgId: string; event?: EventView };

// Create or edit an event (S3). The server validates every field and decides everything; this form
// collects the values, shows the server's messages next to the fields, and keeps one idempotency key
// per form so a double tap or a retry never makes a second event. Times are typed as local wall-clock
// time in the chosen zone, and a preview shows what that is on this device's clock.
export function EventEditor({ orgId, event }: Props) {
  const router = useRouter();
  const client = useMemo(() => createEventClient(createApiClient({ baseUrl: "" })), []);
  const key = useRef<string>(crypto.randomUUID());
  const editing = event !== undefined;

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [startLocal, setStartLocal] = useState(event?.startLocal ?? "");
  const [endLocal, setEndLocal] = useState(event?.endLocal ?? "");
  const [timeZone, setTimeZone] = useState(event?.timeZone ?? defaultTimeZone());
  const [venueName, setVenueName] = useState(event?.venueName ?? "");
  const [street, setStreet] = useState(event?.street ?? "");
  const [city, setCity] = useState(event?.city ?? "");
  const [state, setState] = useState(event?.state ?? "");
  const [zip, setZip] = useState(event?.zip ?? "");
  const [types, setTypes] = useState<string[]>(event?.revivalTypes ?? []);
  const [links, setLinks] = useState<string[]>(event?.links.length ? event.links : [""]);
  const [speakers, setSpeakers] = useState(event?.speakers ?? "");
  const [directions, setDirections] = useState(event?.directions ?? "");
  const [recurrence, setRecurrence] = useState<"none" | "weekly" | "monthly_weekday" | "dates">("none");
  const [until, setUntil] = useState("");
  const [dateList, setDateList] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [needsReason, setNeedsReason] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[]>>({});

  const preview = useMemo(() => {
    const parts = parseLocalDateTime(startLocal);
    if (!parts) return null;
    const when = localToUtc(parts, timeZone);
    const zoneName = EVENT_TIME_ZONES.find((z) => z.value === timeZone)?.label ?? timeZone;
    const there = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(when);
    const here = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(when);
    return `${there} (${zoneName}). On this device: ${here}.`;
  }, [startLocal, timeZone]);

  const fieldError = (name: string) => fields[name]?.[0];
  const toggleType = (slug: string) => setTypes((t) => (t.includes(slug) ? t.filter((x) => x !== slug) : [...t, slug]));

  function collect(): Omit<CreateEventInput, "publish" | "recurrence" | "duplicateOverrideReason"> {
    return {
      title,
      description,
      startLocal,
      ...(endLocal ? { endLocal } : {}),
      timeZone,
      venueName,
      street,
      city,
      state: state as CreateEventInput["state"],
      zip,
      revivalTypes: types,
      links: links.map((l) => l.trim()).filter((l) => l !== ""),
      ...(speakers.trim() ? { speakers } : {}),
      ...(directions.trim() ? { directions } : {}),
    };
  }

  function showFailure(code: string, message: string, byField?: Record<string, string[]>) {
    setFields(byField ?? {});
    setNeedsReason(code === "conflict" && /similar event/i.test(message));
    setError(message);
  }

  async function create(publish: boolean) {
    setBusy(true);
    setError(null);
    setFields({});
    const recurrenceInput =
      recurrence === "weekly" || recurrence === "monthly_weekday"
        ? { recurrence: { kind: recurrence, until } }
        : recurrence === "dates"
          ? { recurrence: { kind: "dates" as const, dates: dateList.split(",").map((d) => d.trim()).filter(Boolean) } }
          : {};
    const result = await client.create(
      orgId,
      { ...collect(), publish, ...recurrenceInput, ...(overrideReason.trim() ? { duplicateOverrideReason: overrideReason } : {}) } as CreateEventInput,
      key.current,
    );
    if (result.ok) {
      key.current = crypto.randomUUID();
      router.push(`/manage/${orgId}/events${publish ? "" : "?filter=drafts"}`);
      router.refresh();
      return;
    }
    showFailure(result.error.code, result.error.message, result.error.fieldErrors);
    setBusy(false);
  }

  async function save(scope: "this" | "series") {
    if (!event) return;
    setBusy(true);
    setError(null);
    setFields({});
    const result = await client.update(event.id, {
      ...collect(),
      version: event.version,
      scope,
      ...(overrideReason.trim() ? { duplicateOverrideReason: overrideReason } : {}),
    });
    if (result.ok) {
      router.push(`/manage/${orgId}/events`);
      router.refresh();
      return;
    }
    showFailure(result.error.code, result.error.message, result.error.fieldErrors);
    setBusy(false);
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardContent>
        <form className="flex flex-col gap-5" noValidate onSubmit={(e) => e.preventDefault()}>
          <h1 className="font-heading text-2xl font-bold">{editing ? "Edit event" : "New event"}</h1>
          <p className="text-sm text-muted-foreground">Do not include personal information about children or private people in any field.</p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} aria-invalid={fieldError("title") ? true : undefined} data-testid="event-title-input" />
            {fieldError("title") && <p className="text-sm text-destructive">{fieldError("title")}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-description">Description</Label>
            <Input id="event-description" value={description} onChange={(e) => setDescription(e.target.value)} data-testid="event-description-input" />
            {fieldError("description") && <p className="text-sm text-destructive">{fieldError("description")}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-start">Starts</Label>
              <Input id="event-start" type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} data-testid="event-start-input" />
              {fieldError("startLocal") && <p className="text-sm text-destructive">{fieldError("startLocal")}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-end">Ends (optional)</Label>
              <Input id="event-end" type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} data-testid="event-end-input" />
              {fieldError("endLocal") && <p className="text-sm text-destructive">{fieldError("endLocal")}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-timezone">Time zone of the event</Label>
            <NativeSelect id="event-timezone" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} data-testid="event-timezone-select">
              {EVENT_TIME_ZONES.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </NativeSelect>
            {preview && (
              <p className="text-sm text-muted-foreground" data-testid="event-time-preview">
                {preview}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-venue">Venue name</Label>
            <Input id="event-venue" value={venueName} onChange={(e) => setVenueName(e.target.value)} data-testid="event-venue-input" />
            {fieldError("venueName") && <p className="text-sm text-destructive">{fieldError("venueName")}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="event-street">Street</Label>
            <Input id="event-street" value={street} onChange={(e) => setStreet(e.target.value)} autoComplete="street-address" data-testid="event-street-input" />
            {fieldError("street") && <p className="text-sm text-destructive">{fieldError("street")}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-city">City</Label>
              <Input id="event-city" value={city} onChange={(e) => setCity(e.target.value)} data-testid="event-city-input" />
              {fieldError("city") && <p className="text-sm text-destructive">{fieldError("city")}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-state">State</Label>
              <NativeSelect id="event-state" value={state} onChange={(e) => setState(e.target.value)} data-testid="event-state-select">
                <option value="">Choose</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </NativeSelect>
              {fieldError("state") && <p className="text-sm text-destructive">{fieldError("state")}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-zip">ZIP code</Label>
              <Input id="event-zip" value={zip} onChange={(e) => setZip(e.target.value)} inputMode="numeric" autoComplete="postal-code" data-testid="event-zip-input" />
              {fieldError("zip") && <p className="text-sm text-destructive">{fieldError("zip")}</p>}
            </div>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm">Kind of gathering (choose at least one)</legend>
            <div className="flex flex-wrap gap-2">
              {REVIVAL_TYPES.map((t) => (
                <Button
                  key={t.slug}
                  type="button"
                  size="sm"
                  variant={types.includes(t.slug) ? "default" : "outline"}
                  aria-pressed={types.includes(t.slug)}
                  onClick={() => toggleType(t.slug)}
                  data-testid={`event-type-${t.slug}`}
                >
                  {t.label}
                </Button>
              ))}
            </div>
            {fieldError("revivalTypes") && <p className="text-sm text-destructive">{fieldError("revivalTypes")}</p>}
          </fieldset>

          {!editing && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-recurrence">Repeats</Label>
              <NativeSelect id="event-recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value as typeof recurrence)} data-testid="event-recurrence-select">
                <option value="none">Does not repeat</option>
                <option value="weekly">Every week</option>
                <option value="monthly_weekday">Monthly, same weekday (for example the 2nd Sunday)</option>
                <option value="dates">On specific dates</option>
              </NativeSelect>
              {(recurrence === "weekly" || recurrence === "monthly_weekday") && (
                <>
                  <Label htmlFor="event-until">Repeat until</Label>
                  <Input id="event-until" type="date" value={until} onChange={(e) => setUntil(e.target.value)} data-testid="event-until-input" />
                </>
              )}
              {recurrence === "dates" && (
                <>
                  <Label htmlFor="event-dates">Other dates (YYYY-MM-DD, separated by commas)</Label>
                  <Input id="event-dates" value={dateList} onChange={(e) => setDateList(e.target.value)} data-testid="event-dates-input" />
                </>
              )}
              {fieldError("recurrence") && <p className="text-sm text-destructive">{fieldError("recurrence")}</p>}
            </div>
          )}

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm">Links (up to {EVENT_LINK_MAX})</legend>
            {links.map((link, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  aria-label={`Link ${i + 1}`}
                  value={link}
                  onChange={(e) => setLinks(links.map((l, j) => (j === i ? e.target.value : l)))}
                  placeholder="https://"
                  inputMode="url"
                  data-testid={`event-link-input-${i}`}
                />
                {links.length > 1 && (
                  <Button type="button" variant="outline" onClick={() => setLinks(links.filter((_, j) => j !== i))} data-testid={`event-remove-link-${i}`}>
                    Remove
                  </Button>
                )}
              </div>
            ))}
            {links.length < EVENT_LINK_MAX && (
              <Button type="button" variant="outline" className="w-fit" onClick={() => setLinks([...links, ""])} data-testid="event-add-link">
                Add a link
              </Button>
            )}
            {fieldError("links") && <p className="text-sm text-destructive">{fieldError("links")}</p>}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-speakers">Speakers (optional)</Label>
              <Input id="event-speakers" value={speakers} onChange={(e) => setSpeakers(e.target.value)} data-testid="event-speakers-input" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="event-directions">Directions (optional)</Label>
              <Input id="event-directions" value={directions} onChange={(e) => setDirections(e.target.value)} data-testid="event-directions-input" />
            </div>
          </div>

          {needsReason && (
            <div className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
              <Label htmlFor="event-override">Another event already uses this venue at this time. Why is this one separate?</Label>
              <Input id="event-override" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} data-testid="event-override-reason" />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive" data-testid="event-error">
              {error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {editing ? (
              event.seriesId ? (
                <>
                  <Button type="button" disabled={busy} onClick={() => void save("this")} data-testid="event-scope-this">
                    Save this event only
                  </Button>
                  <Button type="button" variant="outline" disabled={busy} onClick={() => void save("series")} data-testid="event-scope-series">
                    Save this and the later events
                  </Button>
                </>
              ) : (
                <Button type="button" disabled={busy} onClick={() => void save("this")} data-testid="event-save">
                  Save changes
                </Button>
              )
            ) : (
              <>
                <Button type="button" variant="outline" disabled={busy} onClick={() => void create(false)} data-testid="event-save-draft">
                  Save draft
                </Button>
                <Button type="button" disabled={busy} onClick={() => void create(true)} data-testid="event-publish">
                  Publish
                </Button>
              </>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
