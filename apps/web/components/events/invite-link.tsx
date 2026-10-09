"use client";

import { useMemo, useState } from "react";
import { createApiClient, createSavedClient } from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Make a link to invite a friend (S6). The link is random and works for 30 days. We keep no list of
// who was invited and never read your contacts: you choose where to send it.
export function InviteLink() {
  const client = useMemo(() => createSavedClient(createApiClient({ baseUrl: "" })), []);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function make() {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await client.createInvite();
    if (result.ok) setLink(`${window.location.origin}/invite/${result.data.token}`);
    else setError(result.error.message);
    setBusy(false);
  }

  async function share() {
    if (!link) return;
    const text = "Join me on Signal One Sound to find revival gatherings near you.";
    try {
      if (typeof navigator.share === "function") await navigator.share({ title: "Signal One Sound", text, url: link });
      else {
        await navigator.clipboard.writeText(`${text} ${link}`);
        setNotice("Message copied.");
      }
    } catch {
      setNotice("Sharing was cancelled.");
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>Invite a friend</CardTitle>
        <CardDescription>Make a link and send it however you like. It works for 30 days. We do not keep a list of who you invite.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Button className="w-fit" disabled={busy} onClick={() => void make()} data-testid="invite-button">
          {link ? "Make another link" : "Make an invite link"}
        </Button>
        {link && (
          <>
            <Input readOnly aria-label="Your invite link" value={link} onFocus={(e) => e.currentTarget.select()} data-testid="invite-link" />
            <Button variant="outline" className="w-fit" onClick={() => void share()} data-testid="invite-share">
              Share
            </Button>
          </>
        )}
        {notice && (
          <p role="status" className="text-sm text-muted-foreground" data-testid="invite-copied">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive" data-testid="invite-error">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
