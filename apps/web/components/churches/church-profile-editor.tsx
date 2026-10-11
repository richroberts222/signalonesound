"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { COUNTRIES, MAX_SERVICES, SERVICE_LABEL_MAX, SERVICE_NOTE_MAX, US_STATES, WEEKDAYS, createApiClient, createChurchClient, type Pin } from "@signalone/validation";

import { EVENT_TIME_ZONES, defaultTimeZone } from "@/components/events/time-zones";
import { LocationPicker } from "@/components/events/location-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { addressFromEvent, addressPayload, emptyAddress } from "@/lib/location/address";

// A church's profile (S18, docs/features/s18-find-a-church.md): where it is, and when it meets every week. The server
// validates every field and decides who may save; this collects the values and shows its messages beside the fields.
// Saved in two steps (the address, then the weekly services); a failure in either says so and keeps what was typed.
type Row = { weekday: number; startTime: string; label: string; note: string };

export function ChurchProfileEditor({ orgId }: { orgId: string }) {
  const client = useMemo(() => createChurchClient(createApiClient({ baseUrl: "" })), []);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState(emptyAddress);
  const [city, setCity] = useState("");
  const [street, setStreet] = useState("");
  const [timeZone, setTimeZone] = useState(defaultTimeZone());
  const [pin, setPin] = useState<Pin | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[]>>({});

  useEffect(() => {
    let active = true;
    void client.get(orgId).then((result) => {
      if (!active) return;
      if (result.ok) {
        const { profile, services } = result.data;
        setName(result.data.name);
        if (profile) {
          setAddress(addressFromEvent(profile));
          setCity(profile.city);
          setStreet(profile.street);
          setTimeZone(profile.timeZone);
          setPin(profile.location);
        }
        setRows(services.map((s) => ({ weekday: s.weekday, startTime: s.startTime, label: s.label, note: s.note })));
      } else {
        setError("We could not load this church. Check that it is approved and that you manage it.");
      }
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [client, orgId]);

  const setAddressField = (field: keyof typeof address, value: string) => setAddress((a) => ({ ...a, [field]: value }));
  const setRow = (i: number, change: Partial<Row>) => setRows((list) => list.map((r, j) => (j === i ? { ...r, ...change } : r)));
  const fieldError = (name: string) => fields[name]?.[0];

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    setFields({});
    const profile = await client.saveProfile(orgId, { ...addressPayload(address), street: street.trim(), city: city.trim(), timeZone, location: pin } as Parameters<typeof client.saveProfile>[1]);
    if (!profile.ok) {
      setFields(profile.error.fieldErrors ?? {});
      setError(profile.error.message);
      setBusy(false);
      return;
    }
    const services = await client.saveServices(orgId, { services: rows.map((r) => ({ ...r, label: r.label.trim(), note: r.note.trim() })) });
    if (!services.ok) {
      setFields(services.error.fieldErrors ?? {});
      setError(`Your address was saved, but the service times were not: ${services.error.message}`);
      setBusy(false);
      return;
    }
    setNotice("Saved. People can now find your church and see when you meet.");
    setBusy(false);
  }

  if (!loaded) return <p className="text-muted-foreground">Loading</p>;

  return (
    <Card className="w-full max-w-2xl">
      <CardContent>
        <form className="flex flex-col gap-5" noValidate onSubmit={(e) => e.preventDefault()} data-testid="church-profile-form">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-bold">Church profile{name ? `: ${name}` : ""}</h1>
            <p className="text-sm text-muted-foreground">
              This is what people see on Find a Church: where you are and when you meet each week. Everything here is public. A house church can leave the street blank and show only its city; please do not enter a private home address.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="church-country">Country</Label>
            <NativeSelect id="church-country" value={address.country} onChange={(e) => setAddressField("country", e.target.value)} data-testid="church-country-select">
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
            {fieldError("country") && <p className="text-sm text-destructive">{fieldError("country")}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="church-street">Street (optional)</Label>
            <Input id="church-street" value={street} onChange={(e) => setStreet(e.target.value)} autoComplete="street-address" data-testid="church-street-input" />
            {fieldError("street") && <p className="text-sm text-destructive">{fieldError("street")}</p>}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="church-city">{address.country === "US" ? "City" : "City, town or village"}</Label>
              <Input id="church-city" value={city} onChange={(e) => setCity(e.target.value)} data-testid="church-city-input" />
              {fieldError("city") && <p className="text-sm text-destructive">{fieldError("city")}</p>}
            </div>
            {address.country === "US" ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="church-state">State</Label>
                <NativeSelect id="church-state" value={address.state} onChange={(e) => setAddressField("state", e.target.value)} data-testid="church-state-select">
                  <option value="">Choose</option>
                  {US_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </NativeSelect>
                {fieldError("state") && <p className="text-sm text-destructive">{fieldError("state")}</p>}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="church-region">State, province or region (optional)</Label>
                <Input id="church-region" value={address.region} onChange={(e) => setAddressField("region", e.target.value)} data-testid="church-region-input" />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="church-zip">{address.country === "US" ? "ZIP code" : "Postal code (optional)"}</Label>
              <Input id="church-zip" value={address.zip} onChange={(e) => setAddressField("zip", e.target.value)} inputMode={address.country === "US" ? "numeric" : "text"} data-testid="church-zip-input" />
              {fieldError("zip") && <p className="text-sm text-destructive">{fieldError("zip")}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="church-timezone">Time zone of the church</Label>
            <NativeSelect id="church-timezone" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} data-testid="church-timezone-select">
              {EVENT_TIME_ZONES.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </NativeSelect>
            {fieldError("timeZone") && <p className="text-sm text-destructive">{fieldError("timeZone")}</p>}
          </div>

          <LocationPicker value={pin} onChange={setPin} searchSeed={[street, city].map((s) => s.trim()).filter(Boolean).join(", ")} />
          {fieldError("location") && <p className="text-sm text-destructive">{fieldError("location")}</p>}

          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium">Regular services (every week, up to {MAX_SERVICES})</legend>
            <p className="text-sm text-muted-foreground">Add each time you meet every week. For special gatherings, create an event instead.</p>
            {rows.map((row, i) => (
              <div key={i} className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[9rem_7rem_1fr]" role="group" aria-label={`Service ${i + 1}`}>
                <NativeSelect aria-label={`Service ${i + 1} day`} value={row.weekday} onChange={(e) => setRow(i, { weekday: Number(e.target.value) })} data-testid={`church-service-day-${i}`}>
                  {WEEKDAYS.map((d, n) => (
                    <option key={d} value={n}>
                      {d}
                    </option>
                  ))}
                </NativeSelect>
                <Input aria-label={`Service ${i + 1} time`} type="time" value={row.startTime} onChange={(e) => setRow(i, { startTime: e.target.value })} data-testid={`church-service-time-${i}`} />
                <Input aria-label={`Service ${i + 1} name`} value={row.label} maxLength={SERVICE_LABEL_MAX} placeholder="For example: Sunday worship" onChange={(e) => setRow(i, { label: e.target.value })} data-testid={`church-service-label-${i}`} />
                <Input
                  aria-label={`Service ${i + 1} note (optional)`}
                  className="sm:col-span-2"
                  value={row.note}
                  maxLength={SERVICE_NOTE_MAX}
                  placeholder="Note (optional): for example, childcare provided"
                  onChange={(e) => setRow(i, { note: e.target.value })}
                  data-testid={`church-service-note-${i}`}
                />
                <Button type="button" variant="outline" onClick={() => setRows((list) => list.filter((_, j) => j !== i))} data-testid={`church-service-remove-${i}`}>
                  Remove
                </Button>
                {(fieldError(`services.${i}.label`) || fieldError(`services.${i}.startTime`) || fieldError(`services.${i}`)) && (
                  <p className="text-sm text-destructive sm:col-span-3">{fieldError(`services.${i}.label`) ?? fieldError(`services.${i}.startTime`) ?? fieldError(`services.${i}`)}</p>
                )}
              </div>
            ))}
            {rows.length < MAX_SERVICES && (
              <Button type="button" variant="outline" className="w-fit" onClick={() => setRows((list) => [...list, { weekday: 0, startTime: "10:00", label: list.length === 0 ? "Sunday worship" : "", note: "" }])} data-testid="church-service-add">
                Add a service
              </Button>
            )}
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-destructive" data-testid="church-profile-error">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="text-sm" data-testid="church-profile-notice">
              {notice}{" "}
              <Link href={`/churches/${orgId}`} className="underline underline-offset-2" data-testid="church-profile-view">
                See your church page
              </Link>
            </p>
          )}
          <div className="flex gap-2">
            <Button type="button" disabled={busy} onClick={() => void save()} data-testid="church-profile-save">
              {busy ? "Saving" : "Save profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
