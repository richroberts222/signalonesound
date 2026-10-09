"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { createAlertsClient, createApiClient } from "@signalone/validation";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// The one-tap unsubscribe (S7 AC5). It works without signing in, because the signed link is the proof.
// Opening the page changes nothing (mail scanners open links); only the button does.
export function UnsubscribeConfirm({ token }: { token: string }) {
  const client = useMemo(() => createAlertsClient(createApiClient({ baseUrl: "" })), []);
  const [state, setState] = useState<"ask" | "busy" | "done" | "failed">("ask");
  const [what, setWhat] = useState<"church" | "alert" | null>(null);

  async function confirm() {
    setState("busy");
    const result = await client.unsubscribe(token);
    if (result.ok) {
      setWhat(result.data.what);
      setState("done");
    } else {
      setState("failed");
    }
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{state === "done" ? "You are unsubscribed" : "Stop these messages?"}</CardTitle>
        <CardDescription>
          {state === "done"
            ? what === "church"
              ? "You will not be told about new events from that church or ministry."
              : "That alert is paused. You can turn it back on from your alerts."
            : state === "failed"
              ? "This link did not work. It may have expired or been changed. You can manage your alerts after signing in."
              : "Confirm and we will stop sending these."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {(state === "ask" || state === "busy") && (
          <Button disabled={state === "busy"} onClick={() => void confirm()} data-testid="unsubscribe-confirm">
            Yes, stop them
          </Button>
        )}
        <Link href="/alerts" className={buttonVariants({ variant: "outline" })} data-testid="unsubscribe-manage">
          Manage my alerts
        </Link>
      </CardContent>
    </Card>
  );
}
