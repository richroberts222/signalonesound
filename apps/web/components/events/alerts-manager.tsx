"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ALERT_RADIUS_CHOICES,
  ALERT_TIMEFRAMES,
  MAX_ALERT_RULES,
  REVIVAL_TYPES,
  createAlertsClient,
  createApiClient,
  type Alert,
} from "@signalone/validation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

const typeLabel = (slug: string) => REVIVAL_TYPES.find((t) => t.slug === slug)?.label ?? slug;

// The member's alerts (S7): where, how far, how soon and which kinds of gathering to be told about.
// A place is chosen, not tracked, and is kept only as a point rounded to about one kilometre. The server
// validates everything; this screen shows its answers. Messages go out as one daily digest at 9 am unless
// you choose immediate alerts (at most one a day), and never between 9 pm and 8 am.
export function AlertsManager() {
  const client = useMemo(() => createAlertsClient(createApiClient({ baseUrl: "" })), []);
  const [alerts, setAlerts] = useState<Alert[] | null>(null);
  const [reminders, setReminders] = useState(true);
  const [adding, setAdding] = useState(false);
  const [place, setPlace] = useState("");
  const [radius, setRadius] = useState("25");
  const [timeframe, setTimeframe] = useState("14");
  const [types, setTypes] = useState<string[]>([]);
  const [immediate, setImmediate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [list, settings] = await Promise.all([client.list(), client.settings()]);
    if (list.ok) setAlerts(list.data.items);
    else setError(list.error.message);
    if (settings.ok) setReminders(settings.data.reminders);
  }, [client]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial load from the API
    void load();
  }, [load]);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setPlaceError(null);
    const result = await client.create({
      place,
      radius: radius === "any" ? "any" : Number(radius),
      timeframeDays: Number(timeframe) as 7 | 14 | 30,
      types,
      immediate,
    });
    if (result.ok) {
      setAdding(false);
      setPlace("");
      setTypes([]);
      setImmediate(false);
      await load();
    } else {
      setPlaceError(result.error.fieldErrors?.place?.[0] ?? null);
      setError(result.error.message);
    }
    setBusy(false);
  }

  async function change(run: () => Promise<{ ok: boolean; error?: { message: string } }>) {
    setError(null);
    const result = await run();
    if (result.ok) await load();
    else setError(result.error?.message ?? "Something went wrong");
  }

  return (
    <div className="flex w-full max-w-2xl flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        You will hear about new events that match, in one digest each morning at 9 (or as they happen, at most one a day, if you choose). Nothing is sent between 9 pm and 8 am.
      </p>

      {error && !adding && (
        <p role="alert" className="text-sm text-destructive" data-testid="alerts-error">
          {error}
        </p>
      )}
      {alerts?.length === 0 && !adding && <p data-testid="alerts-empty">You have no alerts yet.</p>}
      <ul className="flex flex-col gap-3" aria-label="Your alerts">
        {alerts?.map((a, i) => (
          <li key={a.id}>
            <Card>
              <CardContent className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">{a.placeLabel}</h2>
                  <Badge variant="outline">{a.radius === "any" ? "Any distance" : `${a.radius} miles`}</Badge>
                  <Badge variant="outline">Next {a.timeframeDays} days</Badge>
                  {a.immediate && <Badge variant="outline">Immediate</Badge>}
                  {a.paused && <Badge data-testid={`alert-paused-${i}`}>Paused</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{a.types.length === 0 ? "Every kind of gathering" : a.types.map(typeLabel).join(", ")}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void change(() => client.update(a.id, { paused: !a.paused }))} data-testid={`alert-pause-${i}`}>
                    {a.paused ? "Resume" : "Pause"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void change(() => client.remove(a.id))} data-testid={`alert-delete-${i}`}>
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {!adding ? (
        <Button className="w-fit" disabled={(alerts?.length ?? 0) >= MAX_ALERT_RULES} onClick={() => setAdding(true)} data-testid="alerts-new-button">
          New alert
        </Button>
      ) : (
        <form onSubmit={save} className="flex flex-col gap-4 rounded-xl border border-border p-4" noValidate aria-label="New alert">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="alert-place">City, state or ZIP code</Label>
            <Input id="alert-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Nashville, TN" autoComplete="off" data-testid="alert-place-input" />
            {placeError && <p className="text-sm text-destructive">{placeError}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="alert-radius">How far</Label>
              <NativeSelect id="alert-radius" value={radius} onChange={(e) => setRadius(e.target.value)} data-testid="alert-radius-select">
                {ALERT_RADIUS_CHOICES.map((r) => (
                  <option key={r} value={String(r)}>
                    Within {r} miles
                  </option>
                ))}
                <option value="any">Any distance</option>
              </NativeSelect>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="alert-timeframe">How soon</Label>
              <NativeSelect id="alert-timeframe" value={timeframe} onChange={(e) => setTimeframe(e.target.value)} data-testid="alert-timeframe-select">
                {ALERT_TIMEFRAMES.map((d) => (
                  <option key={d} value={String(d)}>
                    In the next {d} days
                  </option>
                ))}
              </NativeSelect>
            </div>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm">Kind of gathering (none chosen means all)</legend>
            <div className="flex flex-wrap gap-2">
              {REVIVAL_TYPES.map((t) => (
                <Button
                  key={t.slug}
                  type="button"
                  size="sm"
                  variant={types.includes(t.slug) ? "default" : "outline"}
                  aria-pressed={types.includes(t.slug)}
                  onClick={() => setTypes((c) => (c.includes(t.slug) ? c.filter((x) => x !== t.slug) : [...c, t.slug]))}
                  data-testid={`alert-type-${t.slug}`}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </fieldset>
          <div className="flex items-center gap-3">
            <Checkbox id="alert-immediate" checked={immediate} onCheckedChange={(v) => setImmediate(v === true)} data-testid="alert-immediate-toggle" />
            <Label htmlFor="alert-immediate">Tell me as events are posted (at most one a day)</Label>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive" data-testid="alert-error">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || place.trim() === ""} data-testid="alert-save">
              Save alert
            </Button>
            <Button type="button" variant="outline" onClick={() => { setAdding(false); setError(null); }} data-testid="alert-cancel">
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-3">
        <Checkbox
          id="reminders"
          checked={reminders}
          onCheckedChange={(v) => {
            const next = v === true;
            setReminders(next);
            void change(() => client.updateSettings(next));
          }}
          data-testid="reminder-toggle"
        />
        <Label htmlFor="reminders">Remind me a day before and two hours before the events I save</Label>
      </div>
    </div>
  );
}
