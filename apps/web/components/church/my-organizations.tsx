"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createApiClient, createOrganizationClient, type MyOrganizations } from "@signalone/validation";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const STANDING: Record<string, string> = {
  pending: "Waiting for review",
  approved: "You manage this",
  rejected: "Not approved",
  revoked: "Access removed",
};

// The caller's own churches and ministries and where each request stands (S2).
export function MyOrganizationsList() {
  const client = useMemo(() => createOrganizationClient(createApiClient({ baseUrl: "" })), []);
  const [data, setData] = useState<MyOrganizations | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void client.mine().then((result) => {
      if (!active) return;
      if (result.ok) setData(result.data);
      else setError(result.error.message);
    });
    return () => {
      active = false;
    };
  }, [client]);

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <Link href="/claim-church" className={buttonVariants({ className: "w-fit" })} data-testid="orgs-claim-link">
        Claim a church or ministry
      </Link>
      {error && (
        <p role="alert" className="text-sm text-destructive" data-testid="orgs-error">
          {error}
        </p>
      )}
      {data === null && !error && <p>Loading...</p>}
      {data?.items.length === 0 && <p data-testid="orgs-empty">You have not claimed a church or ministry yet.</p>}
      <ul className="flex flex-col gap-3" aria-label="Your churches and ministries">
        {data?.items.map((item) => (
          <li key={`${item.id}-${item.membership}`}>
            <Card>
              <CardHeader>
                <CardTitle>{item.name}</CardTitle>
                <CardDescription>
                  <Badge data-testid={`orgs-status-${item.id}`}>{STANDING[item.membership] ?? item.membership}</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                {item.description}
                {item.membership === "approved" && (
                  <Link href={`/manage/${item.id}/events`} className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })} data-testid={`orgs-manage-events-${item.id}`}>
                    Manage events
                  </Link>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
