"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createApiClient, createSavedClient } from "@signalone/validation";

import { Button } from "@/components/ui/button";

type State = "loading" | "signedOut" | "saved" | "unsaved";

// Save or remove one event (S6). Anyone can read the page; saving needs an account, so a signed-out
// visitor is sent to sign in and brought back. The server decides everything; this button shows the
// answer and never learns who else saved the event (nobody can).
export function SaveButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const client = useMemo(() => createSavedClient(createApiClient({ baseUrl: "" })), []);
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void client.isSaved(eventId).then((result) => {
      if (!active) return;
      if (result.ok) setState(result.data.saved ? "saved" : "unsaved");
      else setState(result.error.code === "unauthenticated" ? "signedOut" : "unsaved");
    });
    return () => {
      active = false;
    };
  }, [client, eventId]);

  async function toggle() {
    if (state === "signedOut") {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setError(null);
    const result = state === "saved" ? await client.unsave(eventId) : await client.save(eventId);
    if (result.ok) {
      setState(result.data.saved ? "saved" : "unsaved");
    } else if (result.error.code === "policy_reacceptance_required") {
      router.push("/accept-terms");
    } else {
      setError(result.error.message);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant={state === "saved" ? "default" : "outline"}
        className="w-fit"
        disabled={state === "loading"}
        aria-pressed={state === "saved"}
        onClick={() => void toggle()}
        data-testid="event-save-toggle"
      >
        {state === "saved" ? "Saved" : state === "signedOut" ? "Sign in to save" : "Save this event"}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="event-save-error">
          {error}
        </p>
      )}
    </div>
  );
}
