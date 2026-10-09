"use client";

import { useEffect, useMemo, useState } from "react";
import { DISPLAY_NAME_MAX, createApiClient, createProfileClient, type Profile } from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Account settings (S1): name, email preference, a download of everything we hold, and account
// deletion. It calls the API only through the shared client; the server validates and decides, and
// this screen shows the standard message. Deleting needs the word DELETE typed as a second step.
export function AccountSettings() {
  const client = useMemo(() => createProfileClient(createApiClient({ baseUrl: "" })), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void client.get().then(async (result) => {
      if (!active) return;
      if (!result.ok) return setError(result.error.message);
      setProfile(result.data);
      setName(result.data.displayName ?? "");
      // Remember the device's time zone once, so quiet hours and event times can be shown correctly.
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (result.data.policy.accepted && !result.data.timeZone && zone) {
        const updated = await client.update({ timeZone: zone });
        if (active && updated.ok) setProfile(updated.data);
      }
    });
    return () => {
      active = false;
    };
  }, [client]);

  async function save(change: { displayName?: string; emailPref?: boolean }, message: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await client.update(change);
    if (result.ok) {
      setProfile(result.data);
      setNotice(message);
    } else {
      setError(result.error.fieldErrors?.displayName?.[0] ?? result.error.message);
    }
    setBusy(false);
  }

  async function onExport() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await client.exportData();
    if (result.ok) {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "my-signal-one-sound-data.json";
      link.click();
      URL.revokeObjectURL(url);
      setNotice("Your data was downloaded.");
    } else {
      setError(result.error.message);
    }
    setBusy(false);
  }

  async function onDelete() {
    setBusy(true);
    setError(null);
    const result = await client.deleteAccount();
    if (result.ok) {
      // The identity is gone, so the session ends with it; go to the home page.
      window.location.assign("/");
    } else {
      setError(result.error.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Your details</CardTitle>
          <CardDescription>Your sign-in email is kept by our sign-in provider and is not copied here.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form
            className="flex flex-col gap-2"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void save({ displayName: name }, "Name saved.");
            }}
          >
            <Label htmlFor="account-name">Display name</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={DISPLAY_NAME_MAX * 2}
              autoComplete="name"
              data-testid="account-name-input"
            />
            <Button type="submit" disabled={busy || !profile} data-testid="account-name-save">
              Save name
            </Button>
          </form>
          <div className="flex items-center gap-3">
            <Checkbox
              id="account-email"
              checked={profile?.emailPref ?? false}
              disabled={busy || !profile}
              onCheckedChange={(v) => void save({ emailPref: v === true }, "Preference saved.")}
              data-testid="account-email-toggle"
            />
            <Label htmlFor="account-email">Email me about events and updates</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your information</CardTitle>
          <CardDescription>Download everything we hold about you, or delete your account.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Button variant="outline" onClick={() => void onExport()} disabled={busy} data-testid="account-export-button">
            Download my data
          </Button>
          {!confirming ? (
            <Button variant="destructive" onClick={() => setConfirming(true)} disabled={busy} data-testid="account-delete-button">
              Delete my account
            </Button>
          ) : (
            <div className="flex flex-col gap-2" role="group" aria-labelledby="delete-heading">
              <p id="delete-heading" className="text-sm">
                This removes your account and your information. It cannot be undone. Type DELETE to confirm.
              </p>
              <Input
                aria-labelledby="delete-heading"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                data-testid="account-delete-confirm-input"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => void onDelete()}
                  disabled={busy || confirmText !== "DELETE"}
                  data-testid="account-delete-confirm-button"
                >
                  Delete everything
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setConfirming(false);
                    setConfirmText("");
                  }}
                  disabled={busy}
                  data-testid="account-delete-cancel-button"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <p role="alert" data-testid="account-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" data-testid="account-notice" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
    </div>
  );
}
