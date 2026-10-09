"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { createApiClient, createSavedClient } from "@signalone/validation";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// What a friend sees after following an invite link (S6). It counts one arrival (a total only; nothing
// about the visitor is recorded) and offers to create a free account or just look around. Counting
// happens in the browser so link-preview robots that never run a page are not counted.
export function InviteArrival({ token }: { token: string }) {
  const client = useMemo(() => createSavedClient(createApiClient({ baseUrl: "" })), []);
  const counted = useRef(false);

  useEffect(() => {
    if (counted.current) return;
    counted.current = true;
    void client.recordArrival(token);
  }, [client, token]);

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>You are invited</CardTitle>
        <CardDescription>
          Signal One Sound helps you find revival gatherings and churches near you. You can look around without an account.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Link href="/sign-up" className={buttonVariants()} data-testid="invite-sign-up">
          Create a free account
        </Link>
        <Link href="/events" className={buttonVariants({ variant: "outline" })} data-testid="invite-browse">
          Find events
        </Link>
      </CardContent>
    </Card>
  );
}
