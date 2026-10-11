"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createApiClient, createChurchClient } from "@signalone/validation";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// "Complete your church profile" (S18 AC10): shown to a manager whose church has no regular service times yet, with a link
// to the editor. It disappears once a service is saved. Quiet while loading and if the church cannot be read.
export function ChurchProfileCard({ orgId }: { orgId: string }) {
  const client = useMemo(() => createChurchClient(createApiClient({ baseUrl: "" })), []);
  const [needed, setNeeded] = useState(false);

  useEffect(() => {
    let active = true;
    void client.get(orgId).then((result) => {
      if (active && result.ok) setNeeded(result.data.services.length === 0 || result.data.profile === null);
    });
    return () => {
      active = false;
    };
  }, [client, orgId]);

  if (!needed) return null;
  return (
    <Card className="border-primary" data-testid="church-profile-card">
      <CardContent className="flex flex-col gap-2">
        <h2 className="font-heading text-lg font-bold">Complete your church profile</h2>
        <p className="text-sm text-muted-foreground">Add your address and the times you meet every week, so people can find your church and know when to come.</p>
        <Button nativeButton={false} className="w-fit" data-testid="church-profile-card-button" render={<Link href={`/manage/${orgId}/profile`} data-testid="church-profile-card-link" />}>
          Add service times
        </Button>
      </CardContent>
    </Card>
  );
}
