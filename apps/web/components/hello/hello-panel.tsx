"use client";

import { useEffect, useMemo, useState } from "react";
import { createApiClient, createHelloClient, remainingCharacters } from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// S0 walking skeleton screen (docs/features/s0-walking-skeleton.md). It calls the API only
// through the shared client; the browser sends the Clerk session cookie. No business rule lives
// here: the server validates and decides, the screen shows the standard message. The note is
// always rendered as plain text.
export function HelloPanel() {
  const client = useMemo(() => createHelloClient(createApiClient({ baseUrl: "" })), []);
  const [saved, setSaved] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void client.get().then((result) => {
      if (!active) return;
      if (result.ok) {
        setSaved(result.data.note);
        setDraft(result.data.note ?? "");
      } else {
        setError(result.error.message);
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [client]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    const result = await client.put({ note: draft });
    if (result.ok) {
      setSaved(result.data.note);
      setDraft(result.data.note ?? "");
      setNotice("Saved");
    } else {
      setError(result.error.fieldErrors?.note?.[0] ?? result.error.message);
    }
    setPending(false);
  }

  const remaining = remainingCharacters(draft);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <h1 id="hello-title" className="text-xl font-semibold">
          Hello
        </h1>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p data-testid="hello-note-display" aria-live="polite">
          {loading ? "Loading..." : saved === null ? "No note yet." : saved}
        </p>
        <form onSubmit={onSubmit} className="flex flex-col gap-2" noValidate>
          <Input
            name="note"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-labelledby="hello-title"
            aria-invalid={error ? true : undefined}
            aria-describedby="hello-counter"
            autoComplete="off"
            data-testid="hello-note-input"
          />
          <p id="hello-counter" data-testid="hello-counter" className="text-sm text-muted-foreground">
            {remaining} characters left
          </p>
          <Button type="submit" disabled={pending || loading} data-testid="hello-save-button">
            {pending ? "Saving..." : "Save note"}
          </Button>
        </form>
        {error && (
          <p role="alert" data-testid="hello-error" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" data-testid="hello-notice" className="text-sm text-muted-foreground">
            {notice}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
