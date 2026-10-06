"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { FilterChip } from "@/components/discover/filter-chip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { INITIAL_PREFS, MOCK_PUSH_PREVIEW } from "@/lib/member/mock-data";
import {
  RADIUS_CHOICES,
  TIMEFRAMES,
  addLocation,
  canAddLocation,
  describePrefs,
  removeLocation,
  toggleTimeframe,
  validatePrefs,
  type AlertRadius,
  type NotificationPrefs,
} from "@/lib/member/preferences";

/** Interactive mock of "Revival coming near you!" criteria. State is local and never saved. */
export function NotificationPreferences() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(INITIAL_PREFS);
  const [newLabel, setNewLabel] = useState("");
  const [newRadius, setNewRadius] = useState<AlertRadius>(25);
  const [saved, setSaved] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const errors = validatePrefs(prefs);
  const update = (next: Partial<NotificationPrefs>) => {
    setPrefs((p) => ({ ...p, ...next }));
    setSaved(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell aria-hidden className="size-4" /> {MOCK_PUSH_PREVIEW.title}
          </CardTitle>
          <CardDescription>
            Get a push notification when a revival matches your locations and timeframes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button
            type="button"
            variant={prefs.enabled ? "default" : "outline"}
            role="switch"
            aria-checked={prefs.enabled}
            onClick={() => update({ enabled: !prefs.enabled })}
            className="w-fit"
          >
            Alerts {prefs.enabled ? "on" : "off"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Push delivery is not built yet; no device is registered and nothing will be sent.
          </p>
        </CardContent>
      </Card>

      <fieldset disabled={!prefs.enabled} className="flex flex-col gap-6 disabled:opacity-50">
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
            <CardDescription>
              Where should we look? Up to 3 places, each with a distance.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {prefs.locations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No locations yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {prefs.locations.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                  >
                    <span className="text-sm">
                      {l.label} <Badge variant="secondary">within {l.radius} mi</Badge>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remove ${l.label}`}
                      onClick={() => update({ locations: removeLocation(prefs.locations, l.id) })}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            {showErrors && errors.locations && (
              <p role="alert" className="text-sm text-destructive">
                {errors.locations}
              </p>
            )}
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                update({ locations: addLocation(prefs.locations, newLabel, newRadius) });
                setNewLabel("");
              }}
            >
              <label htmlFor="new-location" className="text-sm font-medium">
                Add a location (city and state)
              </label>
              <Input
                id="new-location"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Dallas, TX"
                disabled={!canAddLocation(prefs.locations)}
              />
              <div className="flex flex-wrap gap-2" role="group" aria-label="Distance">
                {RADIUS_CHOICES.map((r) => (
                  <FilterChip key={r} active={newRadius === r} onClick={() => setNewRadius(r)}>
                    {r} mi
                  </FilterChip>
                ))}
              </div>
              <Button
                type="submit"
                variant="outline"
                className="w-fit"
                disabled={!canAddLocation(prefs.locations)}
              >
                Add location
              </Button>
              {!canAddLocation(prefs.locations) && (
                <p className="text-xs text-muted-foreground">Maximum of 3 locations.</p>
              )}
              <p className="text-xs text-muted-foreground">
                The mock does not look the place up; real geocoding and matching are not designed.
              </p>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timeframes</CardTitle>
            <CardDescription>When should a revival count? Choose one or more.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Timeframes">
              {TIMEFRAMES.map((t) => (
                <FilterChip
                  key={t.id}
                  active={prefs.timeframes.includes(t.id)}
                  onClick={() => update({ timeframes: toggleTimeframe(prefs.timeframes, t.id) })}
                >
                  {t.label}
                </FilterChip>
              ))}
            </div>
            {showErrors && errors.timeframes && (
              <p role="alert" className="text-sm text-destructive">
                {errors.timeframes}
              </p>
            )}
          </CardContent>
        </Card>
      </fieldset>

      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>{describePrefs(prefs)}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {prefs.enabled && (
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
              <p className="font-medium">{MOCK_PUSH_PREVIEW.title}</p>
              <p className="text-muted-foreground">{MOCK_PUSH_PREVIEW.body}</p>
            </div>
          )}
          <Button
            type="button"
            className="w-fit"
            onClick={() => {
              const ok = Object.keys(errors).length === 0;
              setShowErrors(!ok);
              setSaved(ok);
            }}
          >
            Save preferences (mock)
          </Button>
          {saved && (
            <p role="status" className="text-sm text-muted-foreground">
              Mock only: nothing was saved. Reload the page and these return to the starting
              example.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
