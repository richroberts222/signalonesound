"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MOCK_INVITE_LINK, MOCK_INVITE_MESSAGE } from "@/lib/member/mock-data";

/** Invite Friends affordance. Copies a fictional example link; no referral is created or tracked. */
export function InviteFriends() {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${MOCK_INVITE_MESSAGE} ${MOCK_INVITE_LINK}`);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite friends</CardTitle>
        <CardDescription>
          Bring friends into the Signal One Sound community. {MOCK_INVITE_MESSAGE}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="rounded-lg border bg-muted/40 px-3 py-2 text-sm break-all">
          {MOCK_INVITE_LINK}
        </p>
        <Button type="button" variant="outline" className="w-fit" onClick={copy}>
          Copy invite (mock)
        </Button>
        <p role="status" className="text-sm text-muted-foreground">
          {status === "copied" && "Copied the example message. "}
          {status === "failed" && "Your browser blocked copying. Select the link above instead. "}
          This link is a placeholder: no invite is created, sent, or tracked. Real invites and the
          native share sheet on iPhone/Android are not designed yet.
        </p>
      </CardContent>
    </Card>
  );
}
