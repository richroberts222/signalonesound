"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Flame } from "lucide-react";
import { createApiClient, createFireClient, formatFireCount } from "@signalone/validation";

import { Button } from "@/components/ui/button";

type State = "loading" | "signedOut" | "fired" | "unfired";

// Give an event a fire, a one-tap recommendation (S19). Anyone can read the total; giving a fire needs an account, so a
// signed-out visitor is sent to sign in and brought back. The server decides everything; this button shows the answer
// and never learns who else gave a fire (nobody can).
export function FireButton({ eventId, initialCount }: { eventId: string; initialCount: number }) {
  const router = useRouter();
  const client = useMemo(() => createFireClient(createApiClient({ baseUrl: "" })), []);
  const [state, setState] = useState<State>("loading");
  const [count, setCount] = useState(initialCount);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void client.isFired(eventId).then((result) => {
      if (!active) return;
      if (result.ok) setState(result.data.fired ? "fired" : "unfired");
      else setState(result.error.code === "unauthenticated" ? "signedOut" : "unfired");
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
    const wasFired = state === "fired";
    const result = wasFired ? await client.unfire(eventId) : await client.fire(eventId);
    if (result.ok) {
      setState(result.data.fired ? "fired" : "unfired");
      if (result.data.fired && !wasFired) setCount((n) => n + 1);
      if (!result.data.fired && wasFired) setCount((n) => Math.max(0, n - 1));
    } else if (result.error.code === "policy_reacceptance_required") {
      router.push("/accept-terms");
    } else {
      setError(result.error.message);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <Button
          variant={state === "fired" ? "default" : "outline"}
          className="w-fit"
          disabled={state === "loading"}
          aria-pressed={state === "fired"}
          onClick={() => void toggle()}
          data-testid="event-fire-toggle"
        >
          <Flame className={state === "fired" ? "fill-current" : undefined} aria-hidden="true" />
          {state === "fired" ? "Fired" : state === "signedOut" ? "Sign in to fire this" : "Fire this"}
        </Button>
        <span className="text-sm text-muted-foreground" data-testid="event-fire-count">
          {formatFireCount(count)}
        </span>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="event-fire-error">
          {error}
        </p>
      )}
    </div>
  );
}
